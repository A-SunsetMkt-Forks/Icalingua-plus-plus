const silk = require('silk-sdk')
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')

process.on('message', async (pathConfig) => {
    let silkDecodeFailed = false
    try {
        const silkBuf = fs.readFileSync(pathConfig.rawFilePath)
        const head = String(buf.slice(0, 7));
        if (!head.includes("SILK")) throw new Error('Not a silk file');
        if (silkBuf[0] !== 0x23) silkBuf = silkBuf.slice(1);
        const bufPcm = silk.decode(silkBuf)
        fs.renameSync(pathConfig.rawFilePath, pathConfig.rawFilePath + '.slk')
        pathConfig.rawFilePath += '.pcm'
        fs.writeFileSync(pathConfig.rawFilePath, bufPcm)
    } catch (err) {
        // 可能是 amr 語音，嘗試直接轉換
        console.error(err)
        silkDecodeFailed = true
        fs.renameSync(pathConfig.rawFilePath, pathConfig.rawFilePath + '.amr')
        pathConfig.rawFilePath += '.amr'
    } finally {
        const msg = await convertToOgg(pathConfig, !silkDecodeFailed)
        if (!silkDecodeFailed) fs.unlinkSync(pathConfig.rawFilePath)
        process.send(msg)
        process.exit(0)
    }
})

console.log('[silkDecode][Child] Child process start! Start to convert record to ogg!');

const convertToOgg = (pathConfig, isPcm = true) => {
    return new Promise((resolve, reject) => {
        ffmpeg(pathConfig.rawFilePath, { timeout: 60 })
            .inputOption(isPcm ? ['-f', 's16le', '-ar', '24000', '-ac', '1'] : [])
            .outputFormat('ogg')
            .on('error', (err) => {
                console.error(err)
                reject(err)
            })
            .on('end', async () => {
                resolve('ffmpeg convert success!')
            }).save(pathConfig.filePath)
    })
}
