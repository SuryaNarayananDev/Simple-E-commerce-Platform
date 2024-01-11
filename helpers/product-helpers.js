var db = require('../config/connection')
var collection = require('../config/collections')
const { response } = require('../app')
const { resolve } = require('promise')
var objectId=require('mongodb').ObjectId
module.exports={

    addProduct:(products,callback)=>{

        db.get().collection('products').insertOne(products).then((data)=>{
            callback(data.insertedId)
        })
    },
    updateProduct:(proId,productDetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.Product_collection).updateOne({_id:new objectId(proId)},
            {
                $set:{
                        name:productDetails.name,
                        discription:productDetails.discription,
                        price:productDetails.price,
                        category:productDetails.category,

                    }
            }).then((response)=>{
                resolve()
            })
        })
    },
    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products=await db.get().collection(collection.Product_collection).find().toArray()
            resolve(products)
        })
    },
    deleteProduct:(proId)=>{
        return new Promise((resolve,reject)=>{
        db.get().collection(collection.Product_collection).deleteOne({_id:new objectId(proId)}).then((response)=>{
            resolve(response)
        })
        })
    },
    showProductDetails:(proId)=>{
        return new Promise((resolve,reject)=> {
            db.get().collection(collection.Product_collection).findOne({_id:new objectId(proId)}).then((product)=>{
                resolve(product)
            })
        })
    },
   
}