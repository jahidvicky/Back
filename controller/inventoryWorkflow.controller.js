// const Order = require("../model/order-model");
// const InventoryService = require("../services/inventory.service");

// /**
//  * RAW → PROCESSING
//  * Admin confirms item sent to lab
//  */
// exports.sendForProcessing = async (req, res) => {
//     try {
//         const { orderId } = req.body;

//         if (!orderId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Order ID is required",
//             });
//         }

//         const order = await Order.findById(orderId);
//         if (!order) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Order not found",
//             });
//         }

//         if (order.orderStatus !== "Placed") {
//             return res.status(400).json({
//                 success: false,
//                 message: "Order must be in Placed status",
//             });
//         }

//         for (const item of order.cartItems) {
//             const isPrescription = !!item.lens;
//             if (!isPrescription) continue;

//             await InventoryService.sendToLab({
//                 productId: item.productId,
//                 location: order.location,
//                 quantity: item.quantity,
//             });
//         }

//         res.json({
//             success: true,
//             message: "Items sent for processing",
//         });
//     } catch (err) {
//         console.error("Send for processing error:", err);
//         res.status(500).json({
//             success: false,
//             message: err.message,
//         });
//     }
// };


// /**
//  * PROCESSING → FINISHED
//  * Admin confirms item received from lab
//  */
// exports.receiveFromProcessing = async (req, res) => {
//     try {
//         const { orderId } = req.body;

//         if (!orderId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Order ID is required",
//             });
//         }

//         const order = await Order.findById(orderId);
//         if (!order) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Order not found",
//             });
//         }

//         if (order.orderStatus !== "Sent To Lab") {
//             return res.status(400).json({
//                 success: false,
//                 message: "Order must be in Sent To Lab status",
//             });
//         }

//         for (const item of order.cartItems) {
//             const isPrescription = !!item.lens;
//             if (!isPrescription) continue;

//             await InventoryService.receiveFromLab({
//                 productId: item.productId,
//                 location: order.location,
//                 quantity: item.quantity,
//             });
//         }

//         res.json({
//             success: true,
//             message: "Items received from processing",
//         });
//     } catch (err) {
//         console.error("Receive from processing error:", err);
//         res.status(500).json({
//             success: false,
//             message: err.message,
//         });
//     }
// };
