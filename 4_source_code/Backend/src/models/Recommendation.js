const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Recommendation = sequelize.define('Recommendation', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    contentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    score: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true // e.g. "Similar to your liked art in Surrealism" or "Trending"
    }
  }, {
    tableName: 'recommendations',
    timestamps: true
  });

  return Recommendation;
};

