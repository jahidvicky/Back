function paymentTemplate(order) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
      <h2 style="color:#e63946;">Thank you for your order!</h2>
      <p>Your order has been placed successfully at <b>ATAL OPTICALS</b>.</p>

      <!-- ORDER SUMMARY -->
      <h3 style="margin-top:20px;">Order Summary</h3>
      <table style="width:100%; border-collapse: collapse; margin-top:10px;">
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Order ID</b></td>
          <td style="padding:8px; border:1px solid #ddd;">${order._id}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Tracking Number</b></td>
          <td style="padding:8px; border:1px solid #ddd;">${order.trackingNumber}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Order Date</b></td>
          <td style="padding:8px; border:1px solid #ddd;">${new Date(order.createdAt).toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Transaction ID</b></td>
          <td style="padding:8px; border:1px solid #ddd;">${order.transactionId}</td>
        </tr>
      </table>

      <!-- PAYMENT DETAILS -->
      <h3 style="margin-top:20px;">Payment Details</h3>
      <table style="width:100%; border-collapse: collapse; margin-top:10px;">
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Payment Method</b></td>
          <td style="padding:8px; border:1px solid #ddd;">${order.paymentMethod}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Payment Status</b></td>
          <td style="padding:8px; border:1px solid #ddd;">${order.paymentStatus}</td>
        </tr>
      </table>

      <!-- CART ITEMS -->
      <h3 style="margin-top:20px;">Items in Your Order</h3>
      <table style="width:100%; border-collapse: collapse; margin-top:10px;">
        <tr>
          <th style="padding:8px; border:1px solid #ddd; background:#f5f5f5;">Product</th>
          <th style="padding:8px; border:1px solid #ddd; background:#f5f5f5;">Qty</th>
          <th style="padding:8px; border:1px solid #ddd; background:#f5f5f5;">Price</th>
        </tr>

        ${order.cartItems
      .map(
        (item) => `
          <tr>
            <td style="padding:8px; border:1px solid #ddd;">
              <b>${item.name}</b><br/>

              <img src="${item.image}" width="80" style="margin-top:5px; border-radius:6px;" />

              <!-- PRODUCT DETAILS -->
              <div style="margin-top:8px; font-size:13px; color:#555;">
                <b>Product Details:</b><br/>

                Product Name: ${item.name}<br/>
            </td>

            <td style="padding:8px; border:1px solid #ddd;">${item.quantity}</td>
            <td style="padding:8px; border:1px solid #ddd;">$${item.price.toFixed(2)}</td>
          </tr>
        `
      )
      .join("")}
      </table>

      <!-- PRICE BREAKDOWN -->
      <h3 style="margin-top:20px;">Price Breakdown</h3>
      <table style="width:100%; border-collapse: collapse; margin-top:10px;">
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Subtotal</b></td>
          <td style="padding:8px; border:1px solid #ddd;">$${order.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Shipping</b></td>
          <td style="padding:8px; border:1px solid #ddd;">$${order.shipping.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Tax</b></td>
          <td style="padding:8px; border:1px solid #ddd;">$${order.tax.toFixed(2)}</td>
        </tr>
        <tr style="background:#f5f5f5;">
          <td style="padding:8px; border:1px solid #ddd;"><b>Total Amount</b></td>
          <td style="padding:8px; border:1px solid #ddd;"><b>$${order.total.toFixed(2)}</b></td>
        </tr>
      </table>

      <!-- SHIPPING DETAILS -->
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
            ${order.shippingAddress.address}, ${order.shippingAddress.city},
            ${order.shippingAddress.province}, ${order.shippingAddress.postalCode},
            ${order.shippingAddress.country}
          </td>
        </tr>
      </table>

      <!-- BILLING DETAILS -->
      <h3 style="margin-top:20px;">Billing Details</h3>
      <table style="width:100%; border-collapse: collapse; margin-top:10px;">
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Name</b></td>
          <td style="padding:8px; border:1px solid #ddd;">${order.billingAddress.fullName}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Phone</b></td>
          <td style="padding:8px; border:1px solid #ddd;">${order.billingAddress.phone}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><b>Address</b></td>
          <td style="padding:8px; border:1px solid #ddd;">
            ${order.billingAddress.address}, ${order.billingAddress.city},
            ${order.billingAddress.province}, ${order.billingAddress.postalCode},
            ${order.billingAddress.country}
          </td>
        </tr>
      </table>

      <p style="margin-top:20px;">We will notify you once your order is shipped.</p>
      <p style="color:#555; margin-top:10px;">— <b>ATAL OPTICALS Team</b></p>
    </div>
  `;
}

module.exports = paymentTemplate;
