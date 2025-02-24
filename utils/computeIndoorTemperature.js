const computeIndoorTemperature = (currentTemperature, previousIndoorTemp, decreaseFactor, increaseFactor) => {
    const diff = previousIndoorTemp - currentTemperature;
    return currentTemperature + diff * Math.exp(diff >= 0? -decreaseFactor : -increaseFactor);
}

module.exports = {
    computeIndoorTemperature
}