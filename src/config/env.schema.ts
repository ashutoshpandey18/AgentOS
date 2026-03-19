import * as Joi from 'joi';

const databaseUrlSchema = Joi.string().uri({ scheme: [/postgresql?/] });

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.alternatives().conditional('NODE_ENV', {
    is: 'production',
    then: databaseUrlSchema.required(),
    otherwise: databaseUrlSchema.default(
      'postgresql://postgres:password@localhost:5432/agent_os',
    ),
  }),
}).unknown(true);
