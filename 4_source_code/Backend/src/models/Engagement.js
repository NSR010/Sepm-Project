const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Engagement = sequelize.define('Engagement', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      field: 'userId', // Or userid in PostgreSQL
      allowNull: false
    },
    contentId: {
      type: DataTypes.INTEGER,
      field: 'contentId',
      allowNull: false
    },
    like: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    save: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    follow: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'engagements', // Matches AI service 'SELECT * FROM engagements'
    timestamps: true
  });

  return Engagement;
};
