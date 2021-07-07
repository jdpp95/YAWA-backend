const DarkSky = require('dark-sky')
const darksky = new DarkSky(process.env.DARK_SKY)

const darkSkyTest = async (req, res) => {

    darksky
        .latitude(4.6116)
        .longitude(-74.2069)
        .time(req.query.time)
        .units('si')
        .get()
        .then(r => {
            res.json(r)
        })
        .catch(console.log)

    
}

module.exports = {
    darkSkyTest
}