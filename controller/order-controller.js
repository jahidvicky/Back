const Order = require("../model/order-model");
const transporter = require("../utils/mailer");
const paymentTemplate = require("../utils/paymentTemplate");
const generateTrackingNumber = require("../utils/generateTrackingNumber");
const productModel = require("../model/product-model");
const dayjs = require("dayjs");
const { verifyPayPalPayment } = require("../utils/paypal");
const InventoryService = require("../services/inventory.service");
// const Inventory = require("../model/inventory-model");
const InventoryHistory = require("../model/inventoryHistory-model");
const sendEmail = require("../utils/sendEmail");

exports.createOrder = async (req, res) => {
  try {
    const { email, cartItems, total, paymentMethod, transactionId, location } =
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

    if (!location || !["east", "west"].includes(location)) {
      return res.status(400).json({
        success: false,
        message: "Location is required (east or west)",
      });
    }

    // Verify payment if PayPal
    if (paymentMethod === "PayPal") {
      if (!transactionId)
        return res
          .status(400)
          .json({ success: false, message: "Transaction ID not found" });

      const verified = await verifyPayPalPayment(transactionId);

      if (verified.status !== "COMPLETED") {
        return res.status(400).json({
          success: false,
          message: "Payment not verified with PayPal",
          verifiedStatus: verified.status,
        });
      }

      // Optional: ensure amount matches
      const amount = verified.purchase_units?.[0]?.amount?.value;
      const amountPaid = parseFloat(amount);
      const totalExpected = parseFloat(total);
      const difference = Math.abs(amountPaid - totalExpected);

      if (difference > 0.05) {
        return res.status(400).json({
          success: false,
          message: `Payment total mismatch. Expected ${totalExpected}, got ${amountPaid}`,
        });
      }
    }

    const orderDate = new Date();
    const trackingNumber = generateTrackingNumber();

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
          (item.product_color && item.product_color[0]) ||
          item.selectedColor ||
          null;

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

        return {
          productId: item.id || item.productId,
          name: item.name,
          price: item.price,

          //  Prefer color variant image if available
          image: variantImage || item.image,
          variantImages, //  store all variant images

          subCategoryName: item.subCategoryName,
          quantity: item.quantity || 1,
          createdBy: product?.createdBy || "admin",
          vendorID: item.vendorID || item.vendorId || null,
          categoryId: item.categoryId || null,

          product_size: item.product_size || [],
          product_color: item.product_color || [],
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
      total: total || 0,
      trackingNumber,
      trackingHistory: [
        { status: "Placed", message: "Order placed successfully" },
      ],
    };

    for (const item of cartItemsWithDetails) {
      try {
        await InventoryService.consumeForOrder({
          productId: item.productId,
          location,
          quantity: item.quantity,
          vendorId: item.createdBy || item.vendorID || null
        });
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "This item was just sold out. Please refresh and try again.",
        });
      }
    }


    const order = new Order(orderData);
    console.log(orderData);
    await order.save();
    await InventoryHistory.create({
      action: "order_placed",
      location: order.location,
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
    if (trackingNumber) order.trackingNumber = trackingNumber;
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

      // Cancel only the product
      product.status = "Cancelled";


      // Check if all products are cancelled
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
          message: "Order cancelled (Product cancelled)",
          updatedBy: "System",
          actorName: "System",
          updatedAt: new Date(),
        });
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
      trackingNumber: order.trackingNumber,
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

    //  Find order by tracking number (case-insensitive)
    const order = await Order.findOne({
      trackingNumber: trackingNumber.toUpperCase(),
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.json({
      success: true,
      trackingNumber: order.trackingNumber,
      status: order.orderStatus,
      deliveryDate: order.deliveryDate,
      trackingHistory: order.trackingHistory,
      shippingAddress: order.shippingAddress,
      total: order.total,
    });
  } catch (err) {
    console.error("Track Order Error:", err);
    res.status(500).json({ success: false, message: err.message });
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
    const { policyId } = req.body;

    const order = await Order.findById(orderId);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    // Find the cart item by policyId
    const cartItemIndex = order.cartItems.findIndex(
      (item) =>
        item.policy &&
        (item.policy._id?.toString() === policyId ||
          item.policy.policyId === policyId)
    );

    if (cartItemIndex === -1)
      return res
        .status(404)
        .json({ success: false, message: "Policy not found" });

    const oldPolicy = order.cartItems[cartItemIndex].policy;
    const today = new Date();
    const durationDays = oldPolicy.durationDays || 1;

    // Save old policy in previousPolicies
    order.cartItems[cartItemIndex].previousPolicies =
      order.cartItems[cartItemIndex].previousPolicies || [];
    order.cartItems[cartItemIndex].previousPolicies.push({
      ...oldPolicy,
      renewedAt: today,
    });

    // Create new renewed policy
    order.cartItems[cartItemIndex].policy = {
      ...oldPolicy,
      purchasedAt: today,
      expiryDate: new Date(
        today.getTime() + durationDays * 24 * 60 * 60 * 1000
      ),
      status: "Active",
      active: true,
      paymentStatus: "Paid",
    };

    // Mark the array as modified (important for Mongoose)
    order.markModified("cartItems");

    await order.save();

    res.json({ success: true, message: "Policy renewed successfully", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.payPolicy = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { policyId } = req.body;

    const order = await Order.findById(orderId);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const cartItem = order.cartItems.find(
      (item) => item.policy && item.policy._id?.toString() === policyId
    );

    if (!cartItem)
      return res
        .status(404)
        .json({ success: false, message: "Policy not found in order" });

    // Mark policy as paid
    cartItem.policy.paymentStatus = "Paid";
    cartItem.policy.pricePaid = cartItem.policy.price; // optional: store the paid amount

    await order.save();

    res.json({
      success: true,
      message: `Policy "${cartItem.policy.name}" payment successful`,
      order,
    });
  } catch (err) {
    console.error("Pay Policy Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to pay for policy" });
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
      status: order.orderStatus, // enum safe
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
      status: order.orderStatus, // ✅ enum safe
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

