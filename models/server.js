const express = require('express');
const cors = require('cors');

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT;
        this.path = '/'

        // Middlewares
        this.middlewares();

        // Routes
        this.routes();
    }

    middlewares(){
        // CORS
        this.app.use(cors());

        //Parse and read body
        this.app.use(express.json());
    }

    routes() {
        this.app.use(this.path, require('../routes/darkSky.routes'));
    }

    listen() {
        this.app.listen(process.env.PORT, ()=>{
            console.log('Server running in port', this.port)
        })
    }
}

module.exports = Server;