// Service Types Enum
export const SERVICE_TYPES = {
  WALKING_BOARDING: 1,
  GROOMING: 2,
} as const;

// Service Type Labels
export const SERVICE_TYPE_LABELS = {
  [SERVICE_TYPES.WALKING_BOARDING]: 'Walking & Boarding',
  [SERVICE_TYPES.GROOMING]: 'Grooming',
} as const;

// Dog Size Categories for Grooming
export const DOG_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium', 
  LARGE: 'large',
} as const;

export const DOG_SIZE_LABELS = {
  [DOG_SIZES.SMALL]: 'Small Dogs',
  [DOG_SIZES.MEDIUM]: 'Medium Dogs',
  [DOG_SIZES.LARGE]: 'Large Dogs',
} as const;

export const DOG_SIZE_DESCRIPTIONS = {
  [DOG_SIZES.SMALL]: 'Up to 25 lbs',
  [DOG_SIZES.MEDIUM]: '26-60 lbs',
  [DOG_SIZES.LARGE]: '61+ lbs',
} as const;

export type ServiceType = typeof SERVICE_TYPES[keyof typeof SERVICE_TYPES];
export type DogSize = typeof DOG_SIZES[keyof typeof DOG_SIZES]; 