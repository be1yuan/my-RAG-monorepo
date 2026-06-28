// upload.mjs
import { readFileSync, existsSync } from "fs"
import { basename } from "path"

const filePath = process.argv[2] // 文件路径
const kbId = process.argv[3] // 知识库ID

if (!filePath || !kbId) {
    console.error("Usage: node upload.mjs <file> <kbId>")
    process.exit(1)
}
if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
}

// 同步读 Buffer → 包成 Blob
const buf = readFileSync(filePath)
const filename = basename(filePath)
const ext = filename.split(".").pop().toLowerCase()
const mime =
    {
        pdf: "application/pdf",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        md: "text/markdown",
        txt: "text/plain",
    }[ext] ?? "application/octet-stream"

const form = new FormData()
form.append("file", new Blob([buf], { type: mime }), filename)

const res = await fetch(`http://localhost:3000/api/kbs/${kbId}/documents`, {
    method: "POST",
    body: form,
})
const text = await res.text()
console.log(`Status: ${res.status}`)
console.log(text)
