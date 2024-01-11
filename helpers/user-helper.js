var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { response, options } = require('../app')
const { ObjectId } = require('mongodb')
const { resolve, reject } = require('promise')
var objectId=require('mongodb').ObjectId
const Razorpay = require('razorpay');
const { promises } = require('dns')
var instance = new Razorpay({ key_id: 'rzp_test_YihSnR3mxDBlTt', key_secret: 'MvKbzQspuTNPiOKZ2pk03eNo' })

module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            userData.password=await bcrypt.hash(userData.password,10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
                resolve(data.insertedId)
            })
            
        })
    },

    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({email:userData.email})
            if(user)
            {
                bcrypt.compare(userData.password,user.password).then((status)=>{

                    if(status){
                        console.log("Login successfully")
                        response.user=user;
                        response.status=true;
                        resolve(response);
                    }else{
                        console.log("Login failed")
                        resolve({status:false})
                    }
                })
            }else{
                console.log("login failed")
                resolve({staus:false})
            }
        })
    },
    addToCart:(proId,userId)=>{
        let proObj={
            item:new objectId(proId),
            quantity:1,
        }
        return new Promise(async(resolve,reject)=>{
            let userCart=await db.get().collection(collection.Cart_Collection).findOne({user:new objectId(userId)})
            if(userCart)
            {
                let proExist=userCart.products.findIndex(product=>product.item==proId)
                if(proExist!=-1)
                {
                    db.get().collection(collection.Cart_Collection).updateOne({user:new objectId(userId),'products.item':new objectId(proId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }
                    ).then(()=>{
                        resolve()
                    })
                }
                else{
                db.get().collection(collection.Cart_Collection).updateOne({user:new objectId(userId)},
                {
                            $push:{products:proObj}    
                },
                { upsert: true }
                ).then((response)=>{
                    resolve()
                })
                }
            }
            else{
                let cartObj={
                    user:new objectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.Cart_Collection).insertOne(cartObj).then((response)=>{
                    resolve()
                })
            }
        })
    },
    getCartProduct:(userId)=>{
     return new Promise(async(resolve,reject)=>{
        let cartItems= await db.get().collection(collection.Cart_Collection).aggregate([
            {
                $match:{user: new ObjectId(userId)}
            },
            {
                $unwind:'$products'
            },
            {
                $project:{
                    item:'$products.item',
                    quantity:'$products.quantity'
                }
            },
            {
                $lookup:{
                    from:collection.Product_collection,
                    localField:'item',
                    foreignField:'_id',
                    as:'product'
                }
            },
            {
                $project:{
                    

                    item:1,quantity:1,product:{ $arrayElemAt: ['$product',0] }
                }
            }
        ]).toArray()
        resolve(cartItems)
    })
    
    },
    getCartCount(userId){
        return new Promise(async(resolve,reject)=>{
            let count=0;
            let cart=await db.get().collection(collection.Cart_Collection).findOne({user:new ObjectId(userId)})
            if(cart)
            {
                count=cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity(details)
    {
        details.quantity=parseInt(details.quantity)
        details.count=parseInt(details.count)
        return new Promise((resolve,reject)=>{

            if(details.count==-1 && details.quantity==1)
            {
                db.get().collection(collection.Cart_Collection)
                .updateOne({_id:new objectId(details.cart)},
                    {
                        $pull:{products:{item:new objectId(details.product)}}
                    }
                ).then((response)=>{
                    resolve({removeProduct:true})
                })
            }else{
                
            db.get().collection(collection.Cart_Collection)
            .updateOne({_id:new objectId(details.cart),'products.item':new objectId(details.product)},
                    {
                        $inc:{'products.$.quantity':details.count}
                    }
                    ).then((response)=>{
                        resolve({status:true})
                    })
            }

        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let total= await db.get().collection(collection.Cart_Collection).aggregate([
                {
                    $match:{user: new ObjectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.Product_collection,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{ $arrayElemAt: ['$product',0] }
                    }
                },
                {
                    $group:{ 
                        _id:null, 
                        total:{ $sum:{$multiply:['$quantity',{$convert:{input:'$product.price',to:'int'}}]}} 
                    }
                }
            ]).toArray()
            let amount=total[0].total
            if(amount==0)
            {
                let amount=null
                resolve(amount)
               
            }
            else{
                
                resolve(total[0].total)
            }
            
            
        })
    },
    placeOrder:(order,products,total)=>{
        return new Promise((resolve,reject)=>{
            let status=order.method==='cod'?'placed':'pending'
            let orderObj={
                deliveryDetails:{
                    name:order.name,
                    address:order.address,
                    mobile:order.mobile,
                    city:order.city,
                    state:order.state,
                    pin:order.pincode
                },
                userId:new objectId(order.userid),
                paymentMethod:order.method,
                totalAmount:total,
                products:products,
                status:status,
                date:new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.Cart_Collection).deleteOne({user:new objectId(order.userid)})
                resolve(response.insertedId)
            })
        })
    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.Cart_Collection).findOne({user:new objectId(userId)})
            resolve(cart.products)
        })
    },
    getOrders:(userid)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems= await db.get().collection(collection.ORDER_COLLECTION)
            .find({userId:new objectId(userid)}).toArray()
            resolve(orderItems)
        })
    },
    getOrderProduct:(userId)=>{
        return new Promise(async(resolve,reject)=>{
           let orderItems= await db.get().collection(collection.ORDER_COLLECTION).aggregate([
               {
                   $match:{_id: new ObjectId(userId)}
               },
               {
                   $unwind:'$products'
               },
               {
                   $project:{
                       item:'$products.item',
                   }
               },
               {
                   $lookup:{
                       from:collection.Product_collection,
                       localField:'item',
                       foreignField:'_id',
                       as:'product'
                   }
               },
               {
                   $project:{
                       
   
                       item:1,quantity:1,product:{ $arrayElemAt: ['$product',0] }
                   }
               }
           ]).toArray()
           resolve(orderItems)
       })
       
       },
       generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: orderId,
              };
              instance.orders.create(options, function(err,order) {
                if(err)
                {
                    console.log(err);
                }
                else{
                    console.log("new order was",order);
                   resolve(order)
                }
              });
        })
       },
       verifyPayment:(details)=>{
            return new Promise((resolve,reject)=>{
                const {
                        createHmac,
                        } = require('node:crypto');

            let hmac = createHmac('sha256', 'MvKbzQspuTNPiOKZ2pk03eNo');
            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
                        hmac=hmac.digest('hex')
                        if(hmac==details['payment[razorpay_signature]'])
                        {
                            resolve()
                        }else{
                            reject()
                        }

            })
       },
       changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:new objectId(orderId)},
            {
                $set:{
                    status:"placed"
                }
            }).then(()=>{
                resolve()
            })
        })
       }
}