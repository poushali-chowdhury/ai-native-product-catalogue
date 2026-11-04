import 'dotenv/config'
import { createApp } from './app.js'
import { readConfig } from './config.js'

const config = readConfig()
const app = createApp({ config })

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Backend listening on http://localhost:${config.port}`)
})
