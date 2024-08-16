const deleteProduct = (btn) => {
    const prodId = btn.parentNode.querySelector('[name=productId]').value;
    const csrf = btn.parentNode.querySelector('[name=_csrf]').value;
    
    const productElement = btn.closest('article'); // gives you the closest element with that selector, so closest article to the btn is the article i want to delete

    fetch('/admin/product/' + prodId, {
           method: 'DELETE',
           headers: {'csrf-token': csrf }
    })
    .then(result => {
       return result.json();
    })
    .then(data => {
        console.log(data); //this is the data of response body
        productElement.parentNode.removeChild(productElement);
    })
    .catch(err => console.log(err));
};