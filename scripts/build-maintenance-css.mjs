#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import tailwindcss from '@tailwindcss/postcss'
import { transform } from 'lightningcss'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const inputPath = path.join(root, 'styles', 'maintenance-src.css')
const outputPath = path.join(root, 'public', 'maintenance', 'maintenance.css')

const css = await readFile(inputPath, 'utf8')
const result = await postcss([tailwindcss()]).process(css, {
  from: inputPath,
  to: outputPath,
})

const minified = transform({
  filename: 'maintenance.css',
  code: Buffer.from(result.css),
  minify: true,
})

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, minified.code)
console.log(
  `wrote ${path.relative(root, outputPath)} (${minified.code.length} bytes, unminified ${Buffer.byteLength(result.css)})`
)
