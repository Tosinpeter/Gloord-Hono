import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { auth } from './routes/auth.js'
import { profileRoute } from './routes/profile.js'
import { couponRoute } from './routes/coupons.js'
import { cardsRoute } from './routes/cards.js'
import { ordersRoute } from './routes/orders.js'
import { notificationsRoute } from './routes/notifications.js'
import { homeRoute } from './routes/home.js'
import { progressRoute } from './routes/progress.js'
import { uploadRoute } from './routes/upload.js'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/api/auth', auth)
app.route('/api/profile', profileRoute)
app.route('/api/coupons', couponRoute)
app.route('/api/cards', cardsRoute)
app.route('/api/orders', ordersRoute)
app.route('/api/notifications', notificationsRoute)
app.route('/api/home', homeRoute)
app.route('/api/progress', progressRoute)
app.route('/api/upload', uploadRoute)

const port = Number(process.env.PORT) || 3000

serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
