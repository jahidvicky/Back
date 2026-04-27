const Order = require("../model/order-model");
const transporter = require("../utils/mailer");
const paymentTemplate = require("../utils/paymentTemplate");
const generateTrackingNumber = require("../utils/generateTrackingNumber");
const productModel = require("../model/product-model");
const dayjs = require("dayjs");

const InventoryService = require("../services/inventory.service");
const InventoryHistory = require("../model/inventoryHistory-model");
const sendEmail = require("../utils/sendEmail");

const loomisService = require("../services/loomisService");


const stripe = require("../config/stripe");

async function verifyStripePayment(transactionId, expectedAmount) {
  const intent = await stripe.paymentIntents.retrieve(transactionId);

  if (intent.status !== "succeeded") {
    throw new Error("Stripe payment not successful");
  }

  if (expectedAmount) {
    const paid = intent.amount_received / 100;
    if (Math.abs(paid - expectedAmount) > 0.05) {
      throw new Error("Payment amount mismatch");
    }
  }

  return intent;
}


exports.createOrder = async (req, res) => {
  try {
    const { email, cartItems, total, paymentMethod, transactionId, } =
      req.body;

    if (!cartItems || cartItems.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Cart items are required" });
    }
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email required" });
    }

    // if (!location || !["east", "west"].includes(location)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Location is required (east or west)",
    //   });
    // }

    const existingOrder = await Order.findOne({
      transactionId: req.body.transactionId
    });

    if (existingOrder) {
      return res.json({
        success: true,
        message: "Order already exists",
        order: existingOrder
      });
    }

    if (paymentMethod === "Stripe") {
      const stripe = require("../config/stripe");
      const intent = await stripe.paymentIntents.retrieve(transactionId);

      if (intent.status !== "succeeded") {
        return res.status(400).json({
          success: false,
          message: "Stripe payment not verified",
        });
      }
    }

    const orderDate = new Date();
    const orderNumber = generateTrackingNumber();

    const cartItemsWithDetails = await Promise.all(
      cartItems.map(async (item) => {
        const product = await productModel.findById(item.id || item.productId);

        let updatedPolicy = null;
        if (item.policy) {
          const expiryDate = dayjs(orderDate)
            .add(item.policy.durationDays, "day")
            .toDate();

          updatedPolicy = {
            ...item.policy,
            purchasedAt: orderDate,
            expiryDate,
            status: "Active",
            active: true,
            expired: false,
          };
        }

        //  Pick correct color variant image (new logic)
        let selectedColor =
          item.product_color?.[0]?.colorName ||
          item.product_color?.[0] ||
          item.selectedColor ||
          null;

        if (typeof selectedColor !== "string") {
          selectedColor = null;
        }

        let variantImage = null;
        let variantImages = [];

        if (product?.product_variants && selectedColor) {
          const variant = product.product_variants.find(
            (v) => v.colorName.toLowerCase() === selectedColor.toLowerCase()
          );
          if (variant) {
            variantImage = variant.images?.[0] || null;
            variantImages = variant.images || [];
          }
        }

        let colors = [];

        if (Array.isArray(item.product_color)) {
          colors = item.product_color.flat().filter(c => typeof c === "string");
        }

        return {
          productId: item.id || item.productId,
          name: item.name,
          price: item.price,
          weight: product?.weight || 1,
          length: product?.length || 10,
          width: product?.width || 8,
          height: product?.height || 6,

          //  Prefer color variant image if available
          image: variantImage || item.image,
          variantImages, //  store all variant images

          subCategoryName: item.subCategoryName,
          quantity: item.quantity || 1,
          createdBy: product?.createdBy || "admin",
          vendorID: item.vendorID || item.vendorId || null,
          categoryId: item.categoryId || null,

          product_size: item.product_size || [],
          product_color: colors || [],
          lens: item.lens || null,
          enhancement: item.enhancement || null,
          thickness: item.thickness || null,
          tint: item.tint || null,

          policy: updatedPolicy,
        };
      })
    );

    const orderData = {
      ...req.body,
      userId: req.user?.id || req.body.userId,
      cartItems: cartItemsWithDetails,
      orderStatus: "Placed",
      paymentStatus: "Paid",
      total: total || 0,
      orderNumber,
      trackingHistory: [
        { status: "Placed", message: "Order placed successfully" },
      ],
    };

    for (const item of cartItemsWithDetails) {
      try {
        await InventoryService.consumeForOrder({
          productId: item.productId,
          // location,
          quantity: item.quantity,
          vendorId: item.vendorID || null
        });
      } catch (err) {
        console.error("Inventory consume failed:", err.message);
        return res.status(400).json({
          success: false,
          message: "This item was just sold out. Please refresh and try again.",
        });
      }
    }


    const order = new Order(orderData);
    await order.save();

    await InventoryHistory.create({
      action: "order_placed",
      // location: order.location,
      orderId: order._id,
      quantity: order.cartItems.reduce((t, i) => t + i.quantity, 0),
      performedBy: order.email,
    });

    try {
      await transporter.sendMail({
        from: `"ATAL OPTICALS" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Order Confirmation",
        html: paymentTemplate(order),
      });
    } catch (mailErr) {
      console.error("Email sending failed:", mailErr.message);
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



const checkAndUpdateExpiredPolicies = (order) => {
  const now = new Date();
  let updated = false;

  order.cartItems.forEach((item) => {
    if (
      item.policy &&
      item.policy.status === "Active" &&
      new Date(item.policy.expiryDate) < now
    ) {
      item.policy.status = "Expired";
      item.policy.active = false;
      item.policy.expired = true;
      updated = true;
    }
  });
  return updated;
};



exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error("Get Order Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch order" });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber, deliveryDate, message } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    //  Update fields
    if (status) order.orderStatus = status;
    if (trackingNumber) {
      order.shippingInfo = order.shippingInfo || {};
      order.shippingInfo.trackingNumber = trackingNumber;
    }
    if (deliveryDate) order.deliveryDate = deliveryDate;

    //  Log status change in tracking history
    order.trackingHistory.push({
      status: status || order.orderStatus,
      message: message || `Order updated to ${status || order.orderStatus}`,
    });

    await order.save();

    res.json({
      success: true,
      message: "Order updated successfully",
      order,
    });
  } catch (err) {
    console.error("Update Order Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.cancleOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId, productId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // ─────────────────────────────
    // PRODUCT LEVEL CANCELLATION
    // ─────────────────────────────
    if (productId) {
      const product = order.cartItems.find(
        (item) => item._id.toString() === productId
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found in this order",
        });
      }

      if (product.status === "Cancelled") {
        return res.status(400).json({
          success: false,
          message: "This product is already cancelled",
        });
      }

      product.status = "Cancelled";

      const allCancelled = order.cartItems.every(
        (item) => item.status === "Cancelled"
      );

      // ─────────────────────────────
      // ORDER LEVEL CANCELLATION (ONLY ONCE)
      // ─────────────────────────────
      if (allCancelled && order.orderStatus !== "Cancelled") {
        order.orderStatus = "Cancelled";

        order.trackingHistory.push({
          status: "Cancelled",
          message: "Order cancelled (all products cancelled)",
          updatedBy: "System",
          actorName: "System",
          updatedAt: new Date(),
        });

        // ── Void Loomis shipment if exists ──
        if (order.shippingInfo?.labelId && !order.shippingInfo?.voided) {
          try {
            await loomisService.voidShipment(order.shippingInfo.labelId);
            order.shippingInfo.voided = true;
            order.shippingInfo.voidedAt = new Date();
          } catch (voidErr) {
            // Don't block cancellation if void fails — log for manual recovery
            console.error(`[CancelOrder] Failed to void shipment for order ${order._id}:`, voidErr.message);
          }
        }
      }

      await order.save();

      return res.status(200).json({
        success: true,
        message: allCancelled
          ? "Product cancelled. Order marked as cancelled."
          : `Product '${product.name}' cancelled successfully.`,
        order,
      });
    }

    // ─────────────────────────────
    // FULL ORDER CANCELLATION
    // ─────────────────────────────
    order.cartItems.forEach((item) => (item.status = "Cancelled"));

    if (order.orderStatus !== "Cancelled") {
      order.orderStatus = "Cancelled";

      order.trackingHistory.push({
        status: "Cancelled",
        message: "Order cancelled by customer",
        updatedBy: "Customer",
        actorName: "Customer",
        updatedAt: new Date(),
      });

      // ── Void Loomis shipment if exists ──
      if (order.shippingInfo?.labelId && !order.shippingInfo?.voided) {
        try {
          await loomisService.voidShipment(order.shippingInfo.labelId);
          order.shippingInfo.voided = true;
          order.shippingInfo.voidedAt = new Date();
        } catch (voidErr) {
          console.error(`[CancelOrder] Failed to void shipment for order ${order._id}:`, voidErr.message);
        }
      }
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });

  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


exports.getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.json({
      success: true,
      trackingNumber: order.shippingInfo?.trackingNumber,
      status: order.orderStatus,
      deliveryDate: order.deliveryDate,
      trackingHistory: order.trackingHistory,
    });
  } catch (err) {
    console.error("Get Order Tracking Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.trackOrderByTrackingNumber = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    let order = await Order.findOne({
      "shippingInfo.trackingNumber": trackingNumber.toUpperCase(),
    });

    if (!order) {
      order = await Order.findOne({
        orderNumber: trackingNumber.toUpperCase(),
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "No order found with this tracking or order number",
      });
    }

    let loomisTracking = null;

    if (order.shippingInfo?.trackingNumber) {
      try {
        loomisTracking = await loomisService.trackShipment(
          order.shippingInfo.trackingNumber
        );
      } catch (err) {
        console.error("Loomis tracking failed:", err.message);
      }
    }

    // Filter out admin-only statuses from customer view
    const ADMIN_ONLY_STATUSES = ["Pickup Scheduled", "Shipment Voided"];

    const customerTrackingHistory = order.trackingHistory.filter((entry) => {
      // Remove admin-only statuses
      if (ADMIN_ONLY_STATUSES.includes(entry.status)) return false;

      // Remove old bad entries where void was incorrectly saved as Cancelled
      if (
        entry.status === "Cancelled" &&
        typeof entry.message === "string" &&
        entry.message.toLowerCase().includes("voided")
      ) return false;

      return true;
    });

    res.json({
      success: true,
      orderStatus: order.orderStatus,
      orderNumber: order.orderNumber,
      trackingNumber: order.shippingInfo?.trackingNumber || null,
      shippingInfo: order.shippingInfo || null,
      deliveryDate: order.deliveryDate || null,
      courierTracking: loomisTracking,
      trackingHistory: customerTrackingHistory,
    });

  } catch (err) {
    console.error("Track Order Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};




exports.getAllOrders = async (req, res) => {
  try {
    // Fetch all orders, latest first
    const orders = await Order.find().sort({ createdAt: -1 });

    // Filter orders where at least one cartItem is created by admin
    const adminOrders = orders.filter((order) =>
      order.cartItems.some(
        (item) => item.createdBy && item.createdBy === "admin"
      )
    );

    let updatedOrders = [];
    for (let order of adminOrders) {
      const changed = checkAndUpdateExpiredPolicies(order);
      if (changed) await order.save();
      updatedOrders.push(order);
    }

    if (!updatedOrders.length) {
      return res
        .status(404)
        .json({ success: false, message: "No admin orders found" });
    }

    res.json({ success: true, orders: updatedOrders });
  } catch (err) {
    console.error("Get Orders Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch admin orders" });
  }
};


exports.getAllOrdersForReport = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    console.error("Get All Orders Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

exports.getAllVendorOrders = async (req, res) => {
  try {
    // Fetch all orders

    const vendorId = req.user._id;

    const orders = await Order.find({
      "cartItems.vendorID": vendorId,
    }).sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    console.error("Get Vendor Orders Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch vendor orders" });
  }
};

// Get Order History by User
exports.getOrderHistory = async (req, res) => {
  try {
    const userId = req.params.userId;

    const orders = await Order.find({ userId }).sort({ createdAt: -1 }); // latest first

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No orders found" });
    }

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.renewPolicy = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { policyId, transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "Stripe transactionId required",
      });
    }

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    const cartItemIndex = order.cartItems.findIndex(
      (item) =>
        item.policy &&
        (item.policy._id?.toString() === policyId ||
          item.policy.policyId === policyId)
    );

    if (cartItemIndex === -1)
      return res.status(404).json({ success: false, message: "Policy not found" });

    const oldPolicy = order.cartItems[cartItemIndex].policy;

    // 🔐 Stripe verification
    await verifyStripePayment(transactionId, oldPolicy.price);

    const today = new Date();
    const durationDays = oldPolicy.durationDays || 1;

    order.cartItems[cartItemIndex].previousPolicies =
      order.cartItems[cartItemIndex].previousPolicies || [];

    order.cartItems[cartItemIndex].previousPolicies.push({
      ...oldPolicy,
      renewedAt: today,
    });

    order.cartItems[cartItemIndex].policy = {
      ...oldPolicy,
      purchasedAt: today,
      expiryDate: new Date(today.getTime() + durationDays * 86400000),
      status: "Active",
      active: true,
      paymentStatus: "Paid",
      transactionId,
    };

    order.markModified("cartItems");
    await order.save();

    res.json({ success: true, message: "Policy renewed successfully", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.payPolicy = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { policyId, transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "Stripe transactionId required",
      });
    }

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    const cartItem = order.cartItems.find(
      (item) => item.policy && item.policy._id?.toString() === policyId
    );

    if (!cartItem)
      return res
        .status(404)
        .json({ success: false, message: "Policy not found in order" });

    //  Stripe verification
    await verifyStripePayment(transactionId, cartItem.policy.price);

    cartItem.policy.paymentStatus = "Paid";
    cartItem.policy.pricePaid = cartItem.policy.price;
    cartItem.policy.transactionId = transactionId;

    order.markModified("cartItems");
    await order.save();

    res.json({
      success: true,
      message: `Policy "${cartItem.policy.name}" payment successful`,
      order,
    });
  } catch (err) {
    console.error("Pay Policy Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



// ===============================
// USER REQUEST EXCHANGE
// =============================

exports.getExchangeRequests = async (req, res) => {
  try {
    const orders = await Order.find({
      "cartItems.exchangeStatus": {
        $in: ["Requested", "Approved", "Completed"],
      },
    })
      .select("_id email cartItems createdAt")
      .sort({ createdAt: -1 });

    const filteredOrders = orders.map((order) => {
      const items = order.cartItems.filter((item) =>
        ["Requested", "Approved", "Completed"].includes(item.exchangeStatus)
      );

      return {
        ...order.toObject(),
        cartItems: items,
      };
    });

    res.status(200).json({
      success: true,
      orders: filteredOrders,
    });
  } catch (error) {
    console.error("Get exchange requests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exchange requests",
    });
  }
};




exports.requestExchange = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productId, reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const item = order.cartItems.id(productId);
    if (!item) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Safety checks
    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({ message: "Order not delivered" });
    }

    if (!order.deliveryDate) {
      return res.status(400).json({ message: "Delivery date missing" });
    }

    if (item.exchangeStatus && item.exchangeStatus !== "None") {
      return res.status(400).json({ message: "Exchange already requested" });
    }

    // 48-hour rule
    const diffHours =
      (Date.now() - new Date(order.deliveryDate).getTime()) /
      (1000 * 60 * 60);

    if (diffHours > 48) {
      return res.status(400).json({ message: "Exchange window expired" });
    }

    // Save images
    const images = req.files?.length
      ? req.files.map(file => `${file.filename}`)
      : [];

    item.exchangeStatus = "Requested";
    item.exchangeReason = reason;
    item.exchangeImages = images;
    item.exchangeRequestedAt = new Date();

    order.trackingHistory.push({
      status: order.orderStatus,
      message: `Exchange requested for ${item.name}`,
      updatedAt: new Date(),
    });

    await order.save();

    res.json({
      success: true,
      message: "Exchange request submitted",
      order,
    });
  } catch (err) {
    console.error("Exchange error:", err);
    res.status(500).json({ message: "Server error" });
  }
};






//-----------------------admin exchnage approve function-------------------------------------------
exports.approveExchange = async (req, res) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ message: "Order not found" });

    const item = order.cartItems.id(productId);
    if (!item)
      return res.status(404).json({ message: "Item not found" });

    if (item.exchangeStatus !== "Requested")
      return res.status(400).json({ message: "Invalid exchange state" });

    item.exchangeStatus = "Approved";
    item.exchangeApprovedAt = new Date();

    order.trackingHistory.push({
      status: order.orderStatus,
      message: `Exchange approved for ${item.name}`,
      updatedAt: new Date(),
    });

    await order.save();

    res.json({
      success: true,
      message: "Exchange approved",
      order,
    });

    // email (safe)
    try {
      await sendEmail({
        to: order.email,
        subject: "Exchange Approved",
        html: `
          <h2>Exchange Approved</h2>
          <p>Your exchange request for <b>${item.name}</b> has been approved.</p>
          <p>We will notify you once the exchange is completed.</p>
        `,
      });
    } catch (e) {
      console.error("Approve exchange email failed:", e.message);
    }
  } catch (error) {
    console.error("Approve exchange error:", error);
    res.status(500).json({ message: "Server error" });
  }
};





exports.rejectExchange = async (req, res) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ message: "Order not found" });

    const item = order.cartItems.id(productId);
    if (!item)
      return res.status(404).json({ message: "Item not found" });

    if (item.exchangeStatus !== "Requested")
      return res.status(400).json({ message: "Invalid exchange state" });

    item.exchangeStatus = "Rejected";
    item.exchangeRejectedAt = new Date();

    order.trackingHistory.push({
      status: order.orderStatus,
      message: `Exchange rejected for ${item.name}`,
      updatedAt: new Date(),
    });

    await order.save();

    res.json({
      success: true,
      message: "Exchange rejected",
      order,
    });

    try {
      await sendEmail({
        to: order.email,
        subject: "Exchange Rejected",
        html: `
          <h2>Exchange Rejected</h2>
          <p>Your exchange request for <b>${item.name}</b> was rejected.</p>
        `,
      });
    } catch (e) {
      console.error("Reject exchange email failed:", e.message);
    }
  } catch (error) {
    console.error("Reject exchange error:", error);
    res.status(500).json({ message: "Server error" });
  }
};





exports.completeExchange = async (req, res) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ message: "Order not found" });

    const item = order.cartItems.id(productId);
    if (!item)
      return res.status(404).json({ message: "Product not found" });

    if (item.exchangeStatus !== "Approved")
      return res.status(400).json({ message: "Exchange must be approved first" });

    item.exchangeStatus = "Completed";
    item.exchangeCompletedAt = new Date();

    order.trackingHistory.push({
      status: order.orderStatus, //  enum safe
      message: `Exchange completed for ${item.name}`,
      updatedBy: "Admin",
      actorName: req.user?.name || "Admin",
      updatedAt: new Date(),
    });

    await order.save();

    res.json({
      success: true,
      message: "Exchange marked as completed",
      order,
    });

    try {
      await sendEmail({
        to: order.email,
        subject: "Exchange Completed",
        html: `
          <h2>Exchange Completed 🎉</h2>
          <p>Your exchange for <b>${item.name}</b> has been completed.</p>
        `,
      });
    } catch (e) {
      console.error("Complete exchange email failed:", e.message);
    }
  } catch (error) {
    console.error("Complete exchange error:", error);
    res.status(500).json({ message: "Server error" });
  }
};





// ===============================
// RETURN REQUEST — Customer raises return
// ===============================

exports.requestReturn = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: "Return reason is required" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({ success: false, message: "Return can only be requested for delivered orders" });
    }

    if (order.returnRequest?.status) {
      return res.status(400).json({ success: false, message: "Return already requested for this order" });
    }

    const images = req.files?.length ? req.files.map((f) => f.filename) : [];

    order.returnRequest = {
      status: "Requested",
      reason: reason.trim(),
      images,
      requestedAt: new Date(),
      resolvedAt: null,
      rejectionReason: null,
    };

    order.trackingHistory.push({
      status: "Returned",
      message: "Customer requested a return",
      updatedBy: "Customer",
      actorName: "Customer",
      updatedAt: new Date(),
    });

    await order.save();

    res.status(200).json({ success: true, message: "Return request submitted", order });
  } catch (err) {
    console.error("Request return error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// RETURN REQUESTS — Admin get all pending
// ===============================

exports.getReturnRequests = async (req, res) => {
  try {
    const orders = await Order.find({
      "returnRequest.status": { $in: ["Requested", "Approved", "Rejected"] },
    })
      .select("_id email orderNumber orderStatus cartItems shippingAddress returnRequest returnInfo createdAt")
      .sort({ "returnRequest.requestedAt": -1 });

    res.status(200).json({ success: true, orders });
  } catch (err) {
    console.error("Get return requests error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch return requests" });
  }
};

// ===============================
// APPROVE RETURN — Admin approves, triggers E-Return API
// ===============================

exports.approveReturn = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!order.returnRequest) return res.status(400).json({ success: false, message: "No return request found" });
    if (order.returnRequest.status !== "Requested") {
      return res.status(400).json({ success: false, message: `Return already ${order.returnRequest.status}` });
    }

    if (order.returnInfo?.trackingNumber) {
      return res.status(400).json({ success: false, message: "E-Return already created for this order" });
    }

    const totalWeight = order.cartItems.reduce(
      (w, item) => w + (item.weight || 1) * (item.quantity || 1), 0
    );

    const rmaNumber = `RMA-${order._id}`;

    const returnShipment = await loomisService.createReturnShipment({
      customerName: order.shippingAddress.fullName,
      customerAddress: order.shippingAddress.address,
      customerCity: order.shippingAddress.city,
      customerProvince: order.shippingAddress.province,
      customerPostalCode: order.shippingAddress.postalCode,
      customerPhone: order.shippingAddress.phone,
      customerEmail: order.email || "",
      weight: totalWeight,
      rmaNumber,
    });

    order.returnRequest.status = "Approved";
    order.returnRequest.resolvedAt = new Date();

    order.returnInfo = {
      trackingNumber: returnShipment.trackingNumber,
      eReturnId: returnShipment.eReturnId,
      rmaNumber,
      shippingDate: returnShipment.shippingDate,
      createdAt: new Date(),
      rawResponse: returnShipment,
    };

    order.orderStatus = "Returned";

    order.trackingHistory.push({
      status: "Returned",
      message: `Return approved by admin. E-Return created. Customer tracking: ${returnShipment.trackingNumber}. Loomis will arrange pickup.`,
      updatedBy: "Admin",
      actorName: "Admin",
      updatedAt: new Date(),
    });

    await order.save();

    try {
      await sendEmail({
        to: order.email,
        subject: "Return Request Approved",
        html: `
          <h2>Return Request Approved</h2>
          <p>Your return request for order <b>#${order.orderNumber}</b> has been approved.</p>
          <p><b>Return Tracking Number:</b> ${returnShipment.trackingNumber}</p>
          <p>Loomis Express will arrange pickup from your address. The label will be printed at the nearest Loomis facility.</p>
          <p><b>RMA Number:</b> ${rmaNumber}</p>
        `,
      });
    } catch (mailErr) {
      console.error("Return approval email failed:", mailErr.message);
    }

    res.status(200).json({
      success: true,
      message: "Return approved and E-Return created",
      trackingNumber: returnShipment.trackingNumber,
      rmaNumber,
      order,
    });
  } catch (err) {
    console.error("Approve return error:", err);
    res.status(500).json({ success: false, message: "Failed to approve return", error: err.message });
  }
};

// ===============================
// REJECT RETURN — Admin rejects with reason
// ===============================

exports.rejectReturn = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ success: false, message: "Rejection reason is required" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!order.returnRequest) return res.status(400).json({ success: false, message: "No return request found" });
    if (order.returnRequest.status !== "Requested") {
      return res.status(400).json({ success: false, message: `Return already ${order.returnRequest.status}` });
    }

    order.returnRequest.status = "Rejected";
    order.returnRequest.rejectionReason = rejectionReason.trim();
    order.returnRequest.resolvedAt = new Date();

    order.trackingHistory.push({
      status: "Delivered",
      message: `Return request rejected. Reason: ${rejectionReason.trim()}`,
      updatedBy: "Admin",
      actorName: "Admin",
      updatedAt: new Date(),
    });

    await order.save();

    try {
      await sendEmail({
        to: order.email,
        subject: "Return Request Rejected",
        html: `
          <h2>Return Request Rejected</h2>
          <p>Your return request for order <b>#${order.orderNumber}</b> has been rejected.</p>
          <p><b>Reason:</b> ${rejectionReason.trim()}</p>
          <p>If you have questions, please contact support.</p>
        `,
      });
    } catch (mailErr) {
      console.error("Return rejection email failed:", mailErr.message);
    }

    res.status(200).json({ success: true, message: "Return rejected", order });
  } catch (err) {
    console.error("Reject return error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};