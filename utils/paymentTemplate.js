function paymentTemplate(order) {
    return `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
      <h2 style="color:#e63946;">Thank you for your order!</h2>
      <p>Your order has been placed successfully at <b>ATAL OPTICALS</b>.</p>
      
      <h3 style="margin-top:20px;">Order Details</h3>
      <table style="width:100%; border-collapse: collapse; margin-top:10px;">
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Order ID</b></td>
          <td style="padding:8px; border:1px solid #ddd;">${order._id}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Payment Method</b></td>
          <td style="padding:8px; border:1px solid #ddd;">${order.paymentMethod}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Payment Status</b></td>
          <td style="padding:8px; border:1px solid #ddd;">${order.paymentStatus}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Total Amount</b></td>
          <td style="padding:8px; border:1px solid #ddd;">$${order.total.toFixed(2)}</td>
        </tr>
      </table>

      <h3 style="margin-top:20px;">Shipping Details</h3>
      <table style="width:100%; border-collapse: collapse; margin-top:10px;">
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Name</b></td>
          <td style="padding:8px; border:1px solid #ddd;">${order.shippingAddress.fullName}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Phone</b></td>
          <td style="padding:8px; border:1px solid #ddd;">${order.shippingAddress.phone}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Address</b></td>
          <td style="padding:8px; border:1px solid #ddd;">
            ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.province}, ${order.shippingAddress.postalCode}, ${order.shippingAddress.country}
          </td>
        </tr>
      </table>

      <p style="margin-top:20px;">We will notify you once your order is shipped.</p>
      <p style="color:#555; margin-top:10px;">— <b>ATAL OPTICALS Team</b></p>
    </div>
  `;
}

module.exports = paymentTemplate;
