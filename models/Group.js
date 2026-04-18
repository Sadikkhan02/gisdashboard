import mongoose, { Schema } from 'mongoose';

const groupSchema = new Schema(
  {
    groupId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    members: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Group || mongoose.model('Group', groupSchema);
