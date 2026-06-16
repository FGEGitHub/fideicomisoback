const jwt = require("jsonwebtoken")
const { hashf } = require('../keys.js')

module.exports = {

    // Decodificacion de token Logueado
    isLoggedInn(req, res, next) {

        const authorization = req.get('authorization')

        let token = null

        // IMPORTANTE EL ESPACIO
        if (
            authorization &&
            authorization.startsWith('Bearer ')
        ) {

            token = authorization.substring(7)

        }

        // SI NO HAY TOKEN
        if (!token) {

            console.log("TOKEN VACIO")

            return res.send('error login')
        }

        let decodedToken = {}

        try {

            decodedToken = jwt.verify(
                token,
                hashf.key
            )

        } catch (error) {

            console.log("error", error)

            return res.send('error login')
        }

        if (!decodedToken.id) {

            return res.send('error login')
        }

        next()
    },



    // Decodificacion Token y verificacion nivel 2
    isLoggedInn2(req, res, next) {

        const authorization = req.get('authorization')

        let token = null

        if (
            authorization &&
            authorization.startsWith('Bearer ')
        ) {

            token = authorization.substring(7)

        }

        if (!token) {

            console.log("TOKEN VACIO NIVEL 2")

            return res.send('error login')
        }

        let decodedToken = {}

        try {

            decodedToken = jwt.verify(
                token,
                hashf.key
            )

        } catch (error) {

            console.log(error)

            return res.send('error login')
        }

        if (
            !decodedToken.id ||
            decodedToken.nivel < 2
        ) {

            return res.send('error login')
        }

        next()
    },



    // Decodificacion nivel 3
    isLoggedInn3(req, res, next) {

        const authorization = req.get('authorization')

        let token = null

        if (
            authorization &&
            authorization.startsWith('Bearer ')
        ) {

            token = authorization.substring(7)

        }

        if (!token) {

            console.log("TOKEN VACIO NIVEL 3")

            return res.send('error login')
        }

        let decodedToken = {}

        try {

            decodedToken = jwt.verify(
                token,
                hashf.key
            )

        } catch (error) {

            console.log(error)

            return res.send('error login')
        }

        if (
            !decodedToken.id ||
            decodedToken.nivel < 3
        ) {

            return res.send('error login')
        }

        next()
    },



    // Decodificacion nivel 4
    isLoggedInn4(req, res, next) {

        const authorization = req.get('authorization')

        let token = null

        if (
            authorization &&
            authorization.startsWith('Bearer ')
        ) {

            token = authorization.substring(7)

        }

        if (!token) {

   

            return res.send('error login')
        }

        let decodedToken = {}

        try {

            decodedToken = jwt.verify(
                token,
                hashf.key
            )

        } catch (error) {

            console.log(error)

            return res.send('error login')
        }

        if (
            !decodedToken.id ||
            decodedToken.nivel < 4
        ) {

            return res.send('error login')
        }

        next()
    },



    // Verificacion token con handlebars
    isLoggedIn(req, res, next) {

        if (req.isAuthenticated()) {

            return next()
        }

        return res.redirect('/signin')
    },



    isNotLoggedIn(req, res, next) {

        if (!req.isAuthenticated()) {

            return next()
        }

        return res.redirect('/profile')
    }

}