const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const source = path.join(root, 'phone-standalone', 'attendance-recorder.html')
const targetDir = path.join(root, 'apk-web')
const target = path.join(targetDir, 'index.html')

fs.mkdirSync(targetDir, { recursive: true })
fs.copyFileSync(source, target)
console.log(`Copied ${source} -> ${target}`)
