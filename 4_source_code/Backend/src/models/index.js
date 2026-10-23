const { sequelize } = require('../config/db');

// Import model definitions
const UserModel = require('./User');
const BoardModel = require('./Board');
const ContentModel = require('./Content');
const EngagementModel = require('./Engagement');
const RecommendationModel = require('./Recommendation');

// Initialize models
const User = UserModel(sequelize);
const Board = BoardModel(sequelize);
const Content = ContentModel(sequelize);
const Engagement = EngagementModel(sequelize);
const Recommendation = RecommendationModel(sequelize);

// Define Associations
// User <-> Content
User.hasMany(Content, { foreignKey: 'userId', as: 'contents', onDelete: 'CASCADE' });
Content.belongsTo(User, { foreignKey: 'userId', as: 'creator' });

// User <-> Board
User.hasMany(Board, { foreignKey: 'userId', as: 'boards', onDelete: 'CASCADE' });
Board.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Board <-> Content
Board.hasMany(Content, { foreignKey: 'boardId', as: 'contents', onDelete: 'SET NULL' });
Content.belongsTo(Board, { foreignKey: 'boardId', as: 'board' });

// User <-> Engagement <-> Content
User.hasMany(Engagement, { foreignKey: 'userId', as: 'engagements', onDelete: 'CASCADE' });
Engagement.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Content.hasMany(Engagement, { foreignKey: 'contentId', as: 'engagements', onDelete: 'CASCADE' });
Engagement.belongsTo(Content, { foreignKey: 'contentId', as: 'content' });

// User <-> Recommendation <-> Content
User.hasMany(Recommendation, { foreignKey: 'userId', as: 'recommendations', onDelete: 'CASCADE' });
Recommendation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Content.hasMany(Recommendation, { foreignKey: 'contentId', as: 'recommendations', onDelete: 'CASCADE' });
Recommendation.belongsTo(Content, { foreignKey: 'contentId', as: 'content' });

module.exports = {
  sequelize,
  User,
  Board,
  Content,
  Engagement,
  Recommendation
};

