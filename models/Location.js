import mongoose, { Schema } from 'mongoose';

const locationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator(value) {
            return Array.isArray(value) && value.length === 2;
          },
          message: 'Coordinates must contain [longitude, latitude].',
        },
      },
    },
    population: {
      type: Number,
      default: 0,
      min: 0,
    },
    crime: {
      type: Number,
      default: 0,
      min: 0,
    },
    developmentIndex: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
  }
);

locationSchema.index({ location: '2dsphere' });

export default mongoose.models.Location || mongoose.model('Location', locationSchema);
