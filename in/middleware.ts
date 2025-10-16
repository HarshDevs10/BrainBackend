import { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv'
dotenv.config()

const middleware = (req: Request, res: Response, next: NextFunction) => {
    let token = req.cookies.uid

    if(!token){
        return res.status(401).json({
            message: "Please signin first."
        })
    }
    else{
        try{
            token = jwt.verify(token, process.env.JWT_SECRET!)
            const id = new mongoose.Types.ObjectId(token.id)
            console.log(id)

            if(id){
                (req as any).Id = id
                next()
            }
        }
        catch(err){
            return res.status(400).json({
                message: "you are not signed in"
            })
        }
    }
}

export default middleware