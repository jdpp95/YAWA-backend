const transition = (start1, end1, start2, end2, value2) => {
    let ratio = (value2 - start2) / (end2 - start2);
    return start1 + (end1 - start1) * ratio;
}

module.exports = {
    transition
};