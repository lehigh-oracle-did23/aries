module.exports = {
    oneoffpool: {
      user: process.env.OneOffUser,
      password: process.env.OneOffPassword,
      connectString: process.env.OneOffConnectionString,
      poolMin: 10,
      poolMax: 10,
      poolIncrement: 0
    }
  };