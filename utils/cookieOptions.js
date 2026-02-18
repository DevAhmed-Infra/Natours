const cookieOptions = {
  expires: new Date(
    Date.now() + parseInt(process.env.JWT_COOKIE) * 24 * 60 * 60 * 1000
  ),
  secure: true,
  httpOnly: true,
};

module.exports = cookieOptions;