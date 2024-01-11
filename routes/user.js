
var express = require('express')
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
const userHelper = require('../helpers/user-helper');
const session = require('express-session');
const { response } = require('../app');
const { log } = require('handlebars');

const logincheckup=(req,res,next)=>{
  if(req.session.user.loggedIn)
    {
      next()
    }
  else
  {
    res.redirect('/login')
  }

}
/* GET home page. */
router.get('/',async function(req, res, next) {
  let user=req.session.user
  let cartCount=null
  if(req.session.user)
  {
    cartCount= await userHelper.getCartCount(req.session.user._id)
  }
  productHelpers.getAllProducts().then((products)=>{
    res.render("user/view-product_user", {products,user,cartCount});
    })
  
});
router.get('/login',(req,res)=>{
  if(req.session.user)
  {
    res.redirect('/')
  }else{
  res.render("user/login",{"loginError":req.session.userLoginError});
  req.session.userLoginError=false
  }
})

router.get('/signup',(req,res)=>{
  res.render("user/signup");
})

router.post('/signup',(req,res)=>{
  userHelper.doSignup(req.body).then((response)=>{
    req.session.user=response.user
    req.session.user.loggedIn=true
    res.redirect('/')
  })
})

router.post('/login',(req,res)=>{
  userHelper.doLogin(req.body).then((response)=>{
    if(response.status)
    {
      req.session.user=response.user
      req.session.user.loggedIn=true
      res.redirect('/')
    }else{
      req.session.userLoginError=true
      res.redirect('/login')
    }

  })
})

router.get('/logout',(req,res)=>{
  req.session.user=null
  res.redirect('/login')
})

router.get('/cart',logincheckup,async(req,res)=>{
  let cartCount= await userHelper.getCartCount(req.session.user._id)
  if(cartCount==0)
  {
    res.render('user/emptycart')
  }
  else
  {
    let products=await userHelper.getCartProduct(req.session.user._id)
    let totalvalue=await userHelper.getTotalAmount(req.session.user._id)
  res.render('user/cart',{products,'user':req.session.user._id,totalvalue})
  }
    
})

router.get('/add-to-cart/:id',(req,res)=>{
  userHelper.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })
})

router.post('/change-product-quantity',(req,res,next)=>{
  userHelper.changeProductQuantity(req.body).then(async(response)=>{
    response.total=await userHelper.getTotalAmount(req.body.user)
    res.json(response)
  })
})

router.get('/place-order',logincheckup,async(req,res)=>{
  let total=await userHelper.getTotalAmount(req.session.user._id)
  res.render('user/check-out',{total,user:req.session.user})
})

router.post('/place-order',async(req,res)=>{
  let products=await userHelper.getCartProductList(req.body.userid)
  let totalPrice=await userHelper.getTotalAmount(req.body.userid)
  userHelper.placeOrder(req.body,products,totalPrice).then((orderId)=>{
  //method:'ONLINE'
    if(req.body['method']==='COD')
    {
      res.json({codSuccess:true})
    }
    else if(req.body['method']==='ONLINE')
    {
      userHelper.generateRazorpay(orderId,totalPrice).then((response)=>{
        res.json(response)
      })
    }
    else
    {
      console.log("error ocurrer in check method of payment .")
    }
    
  })
})
router.get('/success-order',(req,res)=>{
  res.render('user/success-order');
})

router.get('/order',logincheckup,async(req,res)=>{
  let user=req.session.user;
  let orders= await userHelper.getOrders(req.session.user._id)
  res.render('user/order',{'user':req.session.user._id,user,orders})
})

router.get('/view-order-products/:id',logincheckup,async(req,res)=>{
  let user=req.session.user
  let orderid=req.params.id
  let products=await userHelper.getOrderProduct(orderid)
  res.render('user/order-products',{products,user})
})

router.post("/verify-payment", (req, res) => {
  console.log("reach in verification");
  let t=
  console.log("skip")
  userHelper.verifyPayment(req.body).then(()=>{
    userHelper.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      console.log("payment successfull in server")
      res.json({status:true})
    })
  }).catch((err)=>{
    console.log(err,"   !Error In Server ..................................................................................")
    res.json({status:false})
  })
});
module.exports = router;