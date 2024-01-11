

function addToCart(proId)
{
    $.ajax({
        url:"/add-to-cart/"+proId,
        method:'get',
        success:(response)=>{
            if(response.status)
            {
                let count=$('#Cart-Count').html()
                count=parseInt(count)+1
                $('#Cart-Count').html(count)
            }
            else{
            alert(response)
            }
        }
    })
}

function changeQuantity(cartId,proId,userId,count)
    {
        let quantity=parseInt(document.getElementById(proId).innerHTML)
        count=parseInt(count)
        $.ajax({
            url:'/change-product-quantity',
            data:{
                user:userId,
                cart:cartId,
                product:proId,
                count:count,
                quantity:quantity
            },
            method:'post',
            success:(response)=>{
            if(response.removeProduct)
            {
                alert("if you want to remove ?")
                location.reload()
            }
            else{
                document.getElementById(proId).innerHTML=quantity+count;
                document.getElementById('total').innerHTML=response.total
            }
            }
        })
    }

    