const axios = require('axios');
const { getSunAngleFromTime } = require("../utils/getSunAngleFromTime");

const darkSky = async (req, res) => {
    
    let { coords, lat, long, time, timestamp, utc } = req.query;

    const darkSkyUrl = "https://api.darksky.net/forecast";
    const darkSkyKey = process.env.DARK_SKY;

    let baseURL = `${darkSkyUrl}/${darkSkyKey}/`;
    if(coords){
        baseURL += `${coords}`;
        [lat, long] = coords.split(/,\s*/g)
    } else {
        baseURL += `${lat},${long}`;
    }
    
    if(time && timestamp){
        res.status(400).json({
            error: "Please don't send time and timestamp simultaneously"
        })
    }

    let sunAngle;

    if(time){
        baseURL += `,${time}`;
        sunAngle = getSunAngleFromTime(time, lat, long, utc);
    }

    if(timestamp){
        baseURL += `,${timestamp}`
        // getSunAngleFromTimestamp(timestamp);
    }

    console.log(`Sun angle: ${sunAngle}`)

    //TODO: Refactor into a new method
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
    darkSky
}