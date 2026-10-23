const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Content = sequelize.define('Content', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    // Supports both 'creatoruserid' (used by AI service) and 'userId'
    creatoruserid: {
      type: DataTypes.INTEGER,
      field: 'creatoruserid',
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER,
      field: 'creatoruserid', // Maps to creatoruserid in PostgreSQL
      allowNull: false
    },
    boardId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.STRING(50), // 'art', 'photography', 'writing', 'performance'
      allowNull: false
    },
    fileUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    viewsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'content', // Matches AI service 'SELECT * FROM content'
    timestamps: true
  });

  return Content;
};
