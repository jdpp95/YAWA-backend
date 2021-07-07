const axios = require('axios');

const darkSkyTest = async (req, res) => {

    let { date, time, lat, long, coords } = req.query;
    //TODO: Format time

    const darkSkyUrl = "https://api.darksky.net/forecast";
    const darkSkyKey = process.env.DARK_SKY;

    let baseURL = "";
    if(coords){
        baseURL = `${darkSkyUrl}/${darkSkyKey}/${coords}`;
    } else {
        baseURL = `${darkSkyUrl}/${darkSkyKey}/${lat},${long}`;
    }

    if(time){
        baseURL += `,${time}`
    }

    try {
        const instance = axios.create({
            baseURL,
            params: {units: 'ca'}
        });

        const response = await instance.get();

        res.json(response.data);
    } catch (error) {
        console.log(error)
        res.status(400).json({
            error
        })
    }
}

module.exports = {
    darkSkyTest
}