const Order = require("../model/order-model");
const transporter = require("../utils/mailer");
const paymentTemplate = require("../utils/paymentTemplate");
const generateTrackingNumber = require("../utils/generateTrackingNumber");
const productModel = require("../model/product-model");
const dayjs = require("dayjs");
const { verifyPayPalPayment } = require("../utils/paypal")


exports.createOrder = async (req, res) => {
  try {
    const { email, cartItems, total, paymentMethod, transactionId } = req.body;

    if (!cartItems || cartItems.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Cart items are required" });
    }
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    // Verify payment if PayPal
    if (paymentMethod === "PayPal") {
      if (!transactionId)
        return res.status(400).json({ success: false, message: "Transaction ID missing" });

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
      if (parseFloat(amount) !== parseFloat(total)) {
        return res.status(400).json({
          success: false,
          message: "Payment total mismatch",
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

        return {
          productId: item.id || item.productId,
          name: item.name,
          price: item.price,
          image: item.image,
          subCategoryName: item.subCategoryName,
          quantity: item.quantity || 1,
          createdBy: product?.createdBy || "admin",
          vendorID:
            item.vendorID ||
            item.vendorId ||
            null,

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

    const order = new Order(orderData);
    await order.save();

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
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const order = await Order.findById(orderId).populate("userId", "name");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Ensure order belongs to this customer
    if (order.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this order",
      });
    }

    // Only allow cancellation if order is Placed or Processing
    if (!["Placed", "Processing"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order at ${order.orderStatus} stage`,
      });
    }

    // Update order
    order.orderStatus = "Cancelled";

    // Add tracking history
    order.trackingHistory.push({
      status: "Cancelled",
      message: "Order cancelled by customer",
      updatedBy: "Customer",
      actorName: order.userId.name || "Customer",
    });

    await order.save();

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (err) {
    console.error("Cancel Order Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
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
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Find the cart item by policyId
    const cartItemIndex = order.cartItems.findIndex(
      (item) => item.policy && (item.policy._id?.toString() === policyId || item.policy.policyId === policyId)
    );

    if (cartItemIndex === -1)
      return res.status(404).json({ success: false, message: "Policy not found" });

    const oldPolicy = order.cartItems[cartItemIndex].policy;
    const today = new Date();
    const durationDays = oldPolicy.durationDays || 1;

    // Save old policy in previousPolicies
    order.cartItems[cartItemIndex].previousPolicies = order.cartItems[cartItemIndex].previousPolicies || [];
    order.cartItems[cartItemIndex].previousPolicies.push({ ...oldPolicy, renewedAt: today });

    // Create new renewed policy
    order.cartItems[cartItemIndex].policy = {
      ...oldPolicy,
      purchasedAt: today,
      expiryDate: new Date(today.getTime() + durationDays * 24 * 60 * 60 * 1000),
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
