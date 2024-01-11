var express = require('express');
var productHelpers = require('../helpers/product-helpers');
const { response } = require('../app');
var router = express.Router();

/* GET users listing. */
router.get("/", function (req, res, next) {
  productHelpers.getAllProducts().then((products)=>{
  res.render("admin/view-product", { admin: true, products });
  })
});

router.get('/add-product',(req,res)=>{
  res.render("admin/add-product");
})

router.post('/add-product',(req,res)=>{

  productHelpers.addProduct(req.body,(id)=>{
    let image = req.files.image
    image.mv('./public/product-images/'+id+'.jpg',(err,done)=>{
      if(!err){
        res.render('admin/add-product')
      }else{
        console.log(err)
      }
    })
   
  })

  
})

router.get('/delete-product/:id',(req,res)=>{
  let proId=req.params.id
  productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin')
  })
})

router.get('/edit-product/:id',(req,res)=>{
  productHelpers.showProductDetails(req.params.id).then((product)=>{
    res.render("admin/edit-product",{product});
  })
})

router.post('/edit-product/:id',(req,res)=>{
  let id=req.params.id
  productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.image)
    {
      let image = req.files.image
    image.mv('./public/product-images/'+id+'.jpg')
    }
  })
})
module.exports = router;
