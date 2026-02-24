const appError = require("../utils/appError");

module.exports = (roles) => {    
    return (req, res, next) => {
        const userRole = req.currentUser?.role?.toLowerCase();
        const allowedRoles = roles.map(r => r.toLowerCase());
        
        if(!allowedRoles.includes(userRole)) {
            return next(appError.create('this role is not authorized', 401))
        }
        next();
    }
}




/* const appError = require("../utils/appError");

module.exports = (...roles) => {    
    return (req, res, next) => {
        const userRole = req.currentUser?.role?.toLowerCase();
        const allowedRoles = roles.map(r => r.toLowerCase());
        
        if(!allowedRoles.includes(userRole)) {
            return next(appError.create('this role is not authorized', 401))
        }
        next();
    }
} */