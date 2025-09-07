import { Hono } from 'hono';
import { agentsMiddleware } from 'hono-agents';
import { PresentationAgent } from './agents/presentation';

export {PresentationAgent}

const app = new Hono<{ Bindings: Env }>();

app.use("*", agentsMiddleware());

export default app;