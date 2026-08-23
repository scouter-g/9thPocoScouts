const nodemailer = require("nodemailer");

module.exports = async function (context, req) {
  try {
    const { first, last, email } = req.body;

    if (!first || !last || !email) {
      context.res = { status: 400, body: "Missing fields" };
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"Scout Inventory" <${process.env.SMTP_USER}>`,
      to: "scouter.greg@outlook.com",
      subject: "Access Request Received",
      text: `
A new access request has been submitted.

First Name: ${first}
Last Name: ${last}
Email: ${email}

Please review and add this user if appropriate.
      `
    });

    context.res = {
      status: 200,
      body: { success: true }
    };

  } catch (err) {
    context.res = {
      status: 500,
      body: { error: err.message }
    };
  }
};
