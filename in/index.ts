import express from 'express';
import jwt from 'jsonwebtoken';
import z, { config } from 'zod';
import bcrypt from 'bcrypt';
import { models } from './db.js'
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import middleware from './middleware.js';
import Hased from './hash.js';
import cors from 'cors'
import * as dotenv from 'dotenv';
dotenv.config();

const { userModel, linkModel, tagModel, contentModel } = models
const secret = process.env.JWT_SECRET
const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors())

app.post('/api/v1/Signup', async (req, res) => {

    const User = z.object({
        userName: z.string().min(3).max(10),
        password: z.string().min(8).max(20).refine(
            (value) => /[a-z]/.test(value),
            {message: "password should contain atleast one lowercase character"}
        ).refine(
            (value) => /[A-Z]/.test(value),
            {message: "password should contain atleast one uppercase character"}
        ).refine(
            (value) => /[!@#$%^&*(),.?":{}|<>]/.test(value),
            {message: "password should contain atleast one special character"}
        )
    })

    const ParsedReq = User.safeParse(req.body);
    
    if(ParsedReq.success == false){
        return res.status(411).json({
            message: "an error occured while validating the input",
            err: ParsedReq.error.issues[0]?.message
        })
    }

    const userName = ParsedReq.data.userName
    const password = ParsedReq.data.password

    const hashPassword = await bcrypt.hash(password, 5)
    try{
        const user = await userModel.create({
            userName: userName,
            password: hashPassword
        })
    }
    catch(error: any){
        return res.status(403).json({
            message: "An error occured while creating an entry in DataBase.",
            err: error.message
        })
    }

    res.status(200).json({
        message: "you have signed up successfully"
    })
})

app.post('/api/v1/Signin', async (req, res) => {
    const User = z.object({
        userName: z.string().min(3).max(10),
        password: z.string().min(8).max(20)
    })

    console.log(req.body)
    const ParsedReq = User.safeParse(req.body)
    console.log(ParsedReq)

    if(ParsedReq.success == false){
        return res.status(411).json({
            message: "an error occured while validating the input",
            err: ParsedReq.error.issues[0]?.message
        })
    }

    const userName = ParsedReq.data.userName
    const password = ParsedReq.data.password
    let user = null;

    try{
        user = await userModel.findOne({
            userName
        })

        console.log(user)

        if(!user){
            return res.status(400).json({
                message: "The user have not Signed in yet."
            })
        }
    }
    catch(error){
        return res.status(400).json({
            message: "An error occured while finding the User",
            err: error
        })
    }

    const validPassword = await bcrypt.compare(password, user.password)

    if(validPassword){
        let token = null;
        try{
            token = jwt.sign({id: user._id}, secret!)
            console.log(token)
        }
        catch(error){
            return res.status(403).json({
                message: "The token cannot be generated",
                err: error
            })
        }
        
        return res.status(200).cookie("uid", token).json({
            message: "Signin is successful"
        })
    }
    else{
        return res.status(401).json({
            message: "The password is incorrect. Enter the right password."
        })
    }

})

app.post('/api/v1/content', middleware, async (req, res) => {
    const content = z.object({
        link: z.string(),
        type: z.string(),
        title: z.string().max(250).min(3),
        tags: z.string()
    })

    const ParsedReq = content.safeParse(req.body)
    console.log(ParsedReq)

    if(!ParsedReq.success){
        return res.status(400).json({
            message: "An error occured while validating the input",
            err: ParsedReq.error.cause
        })
    }

    const Id = (req as any).Id
    const link = ParsedReq.data.link
    const type = ParsedReq.data.type
    const title = ParsedReq.data.title
    const tags = ParsedReq.data.tags
    let obj = null

    try{
        const tag = await tagModel.findOne({
            title: tags
        })

        if(tag){
            obj = tag._id
        }
        else{
            try{
                const tag = await tagModel.create({
                    title: tags
                })
                obj = tag._id
            }
            catch(error){
                return res.status(500).json({
                    message: "An error occured while creating the tag",
                    err: error
                })
            }
        }
    }
    catch(error){
        return res.status(500).json({
            message: "An error occured while creating the finding the tag",
            error: error
        })
    }

    try{
        console.log(obj)
        const user = await contentModel.create({
            link: link,
            type: type,
            title: title,
            tags: obj,
            userId: Id
        })
    }
    catch(error){
        return res.status(401).json({
            message: "An error occured while creating the content.",
            error: error
        })
    }

    return res.status(200).json({
        message: "The content is created"
    })

})

app.get('/api/v1/content', middleware, async (req, res) => {

    const userId = (req as any).Id
    let content = null

    try{
        content = await contentModel.find({
            userId: userId
        }).populate("tags")
        .populate("userId", "userName")
    }
    catch(err){
        return res.status(400).json({
            message: "An error occured while retrieving the content.",
            error: err
        })
    }

    return res.status(200).json({
        message: "All the contents are.",
        content: content
    })
})

app.delete('/api/v1/content', middleware, async (req, res) => {
    const contentId = req.body.contentId
    console.log(contentId)
    let content = null

    try{
        content = await contentModel.findByIdAndDelete(contentId)
                    .populate("tags")
                    .populate("userId", "userName")

        if(!content){
            return res.status(500).json({
                message: "This content is not present"
            })
        }
    }
    catch(error){
        return res.status(400).json({
            message: "An error occured while deleting the content.",
            error: error
        })
    }

    return res.status(200).json({
        message: "Your content is successfully deleted.",
        content: content
    })
})

app.get('/api/v1/share', middleware, async (req, res) => {
    const link = z.object({
        share: z.boolean()
    })

    const parsedReq = link.safeParse(req.body)

    if(!parsedReq.success){
        return res.status(400).json({
            message: "An error occured while validating the input",
            error: parsedReq.error
        })
    }

    const share = parsedReq.data.share
    const userId = (req as any).Id
    let hash = null

    if (share){
        try{
            hash = Hased()
            const user = await linkModel.create({
                hash: hash,
                userId: userId
            })
        }
        catch(error){
            return res.status(400).json({
                message: "An error occured while creating the hash in database.",
                error: (error as any).message
            })
        }
    }
    else{
        try{
            const user = await linkModel.findOneAndDelete({
                userId: userId
            }).populate("userId", "userName")

            return res.status(200).json({
                message: "The hash was successfully destroyed.",
                // @ts-ignore
                user: user?.userId?.userName
            })
        }
        catch(error){
            return res.status(400).json({
                message: "An error occured while deleting the hash",
                error: (error as any).message
            })
        }
    }

    return res.status(200).json({
        message: "The content is successfully shared.",
        hash: hash
    })
})

app.get('/api/v1/:sharelink', async (req, res) => {
    const link = req.params.sharelink
    let ink = null

    try{
        ink = await linkModel.findOne({
            hash: link
        })
        if (!ink){
            return res.status(500).json({
                message: "The sharelink is not valid."
            })
        }
    }
    catch(error){
        return res.status(200).json({
            message: "An error occured while finding the hash userId.",
            error: error
        })
    }

    let content = null
    try{
        content = await contentModel.find({
            userId: ink.userId
        }).populate("tags")
          .populate("userId", "userName")

        if(!content){
            return res.status(500).json({
                message: "There is no content for this sharable link."
            })
        }
    }
    catch(error){
        return res.status(400).json({
            message: "An error occured while finding the contents.",
            error: error
        })
    }

    return res.status(200).json({
        message: "The contents are.",
        content: content
    })

})

const main = () => {
    mongoose.connect(process.env.MONGOOSE_URL!)
            .then(() => {
                app.listen(3000)
                console.log("The backend is connected to the database.")
            })
            .catch(err => {console.log("Data base is not connected due to: " + err); console.log(process.env.JWT_SECRET)})
}

main()