import mongoose from 'mongoose'

const Schema = mongoose.Schema
const Model = mongoose.Model
const ObjectID = Schema.Types.ObjectId
const options = ["Youtube", "Document", "image", "audio"]

const UserSchema = new Schema({
    userName: {type: String, unique: true, required: true},
    password: {type: String, required: true}
})

const contentSchema = new Schema({
    link: {type: String, required: true},
    type: {type: String, enum: options, required: true},
    title: {type: String, required: true},
    tags: [{type: ObjectID, ref: 'tag'}],
    userId: {type: ObjectID, required: true, ref: 'User'}
})

const tagSchema = new Schema({
    title: {type: String, unique: true}
})

const linkSchema = new Schema({
    hash: {type: String, required: true},
    userId: {type: ObjectID, ref: 'User'}
})

const User = mongoose.model("User", UserSchema);
const tag = mongoose.model("tag", tagSchema);
const link = mongoose.model("link", linkSchema);
const content = mongoose.model("content", contentSchema);

export const models = {
    userModel: User,
    tagModel: tag,
    linkModel: link,
    contentModel: content
}