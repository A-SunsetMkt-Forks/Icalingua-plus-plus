import path from 'path'

export const faceNameToLottie = new Map<string, number>([
    ['打call', 1],
    ['变形', 2],
    ['嗑到了', 3],
    ['仔细分析', 4],
    ['加油', 5],
    ['我没事', 6],
    ['菜汪', 7],
    ['崇拜', 8],
    ['比心', 9],
    ['庆祝', 10],
    ['老色痞', 11],
    ['吃糖', 12],
    ['篮球', 13],
    ['惊吓', 14],
    ['生气', 15],
    ['流泪', 16],
    ['蛋糕', 17],
    ['鞭炮', 18],
    ['烟花', 19],
    ['我想开了', 20],
    ['舔屏', 21],
    ['花朵脸', 22],
    ['热化了', 23],
    ['打招呼', 24],
    ['你真棒棒', 25],
    ['酸Q', 26],
    ['我方了', 27],
    ['大怨种', 28],
    ['红包多多', 29],
    ['敲敲', 30],
    ['贴贴 ', 31],
    ['坚强', 32],
    ['骰子', 33],
    ['包剪锤', 34],
    ['太阳', 35],
    ['月亮', 36],
    ['戳一戳', 37],
    ['龙年快乐', 38],
    ['新年中龙', 39],
    ['新年大龙', 40],
    ['略略略', 41],
])

export const faceIdToLottie = new Map([
    [311, 1],
    [312, 2],
    [313, 3],
    [314, 4],
    [315, 5],
    [316, 6],
    [317, 7],
    [318, 8],
    [319, 9],
    [320, 10],
    [321, 11],
    [324, 12],
    [114, 13],
    [325, 14],
    [326, 15],
    [5, 16],
    [53, 17],
    [137, 18],
    [333, 19],
    [338, 20],
    [339, 21],
    [337, 22],
    [340, 23],
    [341, 24],
    [346, 25],
    [342, 26],
    [343, 27],
    [344, 28],
    [345, 29],
    [351, 30],
    [350, 31],
    [349, 32],
    [358, 33],
    [359, 34],
    [74, 35],
    [75, 36],
    [181, 37],
    [392, 38],
    [393, 39],
    [394, 40],
    [395, 41],
])

export const getLottiePath = (id: number, resultId?: string) => {
    // @ts-ignore
    return path.join(__static, 'qlottie', `${id}`, resultId ? `${id}_${resultId}.json` : `${id}.json`)
}

export default (msgText: string, time: number, result?: boolean): string | undefined => {
    const idMatch = msgText.match(/^\[QLottie: (\d+)\,(\d+)\]$/) || msgText.match(/^\[QLottie: (\d+)\,(\d+)\,(\d+)\]$/)
    if (idMatch) {
        const lottieId = faceIdToLottie.get(parseInt(idMatch[2])) || parseInt(idMatch[1])
        if (lottieId) {
            return getLottiePath(lottieId, result ? idMatch[3] : undefined)
        }
    }
    const nameMatch = msgText.match(/^\[([\u4e00-\u9FA5a-zA-Z]{2,5})\](?:请使用最新版手机QQ体验新功能)?$/)
    if (nameMatch) {
        const lottieId = faceNameToLottie.get(nameMatch[1])
        if (lottieId) {
            return getLottiePath(lottieId)
        }
    }
    const nameMatch2 = msgText.match(/^\/([\u4e00-\u9FA5a-zA-Z]{2,5})$/)
    if (nameMatch2) {
        const lottieId = faceNameToLottie.get(nameMatch2[1])
        if (lottieId) {
            return getLottiePath(lottieId)
        }
    }
}
