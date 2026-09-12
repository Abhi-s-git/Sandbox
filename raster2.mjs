import sharp from "sharp"

const base = "E:/sandbox/design/04-games/image.svg"

await sharp(base, { density: 96 }).png().toFile("C:/Users/ABHI/AppData/Local/Temp/opencode/row1.png")

await sharp(base, { density: 144 })
  .extract({ left: 0, top: 105, width: 672, height: 71 })
  .png()
  .toFile("C:/Users/ABHI/AppData/Local/Temp/opencode/bottom.png")

console.log("done")
