import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.10/+esm';
const db=createClient('https://zfjvdzjdaeymisczfznq.supabase.co','sb_publishable_3tF7Q3gB8X67iplhUO1fzw_rh8T-Enl');
const $=id=>document.getElementById(id);
const msg=(s,bad=false)=>{const el=$('marketMsg');el.textContent=s;el.style.color=bad?'#ad2929':'#075a36'};
let user=null;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function refresh(){
 const {data:{user:u}}=await db.auth.getUser();user=u;
 $('authPanel').hidden=!!user;$('memberPanel').hidden=!user;$('logout').hidden=!user;
 if(!user)return;
 $('memberEmail').textContent=user.email||'';
 const [{data:p},{data:r}]=await Promise.all([db.from('products').select('id,name,status,created_at').eq('owner_id',user.id).order('created_at',{ascending:false}).limit(30),db.from('buy_requests').select('id,product_name,status,created_at').eq('buyer_id',user.id).order('created_at',{ascending:false}).limit(30)]);
 const render=(items,type)=>items?.length?items.map(x=>'<li>'+escape(x.name||x.product_name)+' — '+escape(x.status)+' <button type="button" data-type="'+type+'" data-id="'+escape(x.id)+'">Delete pending</button></li>').join(''):'<li>No entries yet</li>';
 $('myProducts').innerHTML=render(p,'products');$('myRequests').innerHTML=render(r,'buy_requests');
}
$('authForm').addEventListener('submit',async e=>{
 e.preventDefault();const email=$('authEmail').value.trim(),password=$('authPassword').value;
 if(password.length<8){msg('Password must be at least 8 characters.',true);return}
 const signup=$('authMode').value==='signup';
 const {data,error}=signup?await db.auth.signUp({email,password}):await db.auth.signInWithPassword({email,password});
 if(error){msg(error.message,true);return}
 msg(signup&&!data.session?'Account created. Check your email to confirm registration.':'Signed in successfully.');
 await refresh();
});
$('logout').addEventListener('click',async()=>{await db.auth.signOut();msg('Signed out.');await refresh()});
$('profileForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!user)return;
 const {error}=await db.from('profiles').upsert({id:user.id,display_name:$('profileName').value.trim(),country:$('profileCountry').value.trim(),role:$('profileRole').value},{onConflict:'id'});
 msg(error?error.message:'Profile saved.',!!error);
});
$('productForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!user)return;
 const {error}=await db.from('products').insert({owner_id:user.id,name:$('productName').value.trim(),category:$('productCategory').value.trim(),country:$('productCountry').value.trim(),quantity:$('productQuantity').value.trim(),description:$('productDescription').value.trim()});
 msg(error?error.message:'Product submitted for review.',!!error);if(!error){e.target.reset();await refresh()}
});
$('requestForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!user)return;
 const {error}=await db.from('buy_requests').insert({buyer_id:user.id,product_name:$('requestName').value.trim(),country:$('requestCountry').value.trim(),description:$('requestDescription').value.trim()});
 msg(error?error.message:'Buying request submitted for review.',!!error);if(!error){e.target.reset();await refresh()}
});
$('memberPanel').addEventListener('click',async e=>{
 const b=e.target.closest('button[data-id]');if(!b||!user)return;
 const table=b.dataset.type;if(!['products','buy_requests'].includes(table))return;
 if(!confirm('Delete this pending entry?'))return;
 const {error}=await db.from(table).delete().eq('id',b.dataset.id).eq('status','pending');
 msg(error?error.message:'Pending entry deleted.',!!error);await refresh();
});
async function publicListings(){
 const [{data:p,error:ep},{data:r,error:er}]=await Promise.all([db.from('products').select('name,category,country,description,quantity').eq('status','approved').order('created_at',{ascending:false}).limit(30),db.from('buy_requests').select('product_name,country,description').eq('status','approved').order('created_at',{ascending:false}).limit(30)]);
 if(ep||er){$('publicListings').textContent='Listings temporarily unavailable.';return}
 const cards=(p||[]).map(x=>'<article class="marketCard"><b>'+escape(x.name)+'</b><p>'+escape(x.category)+' · '+escape(x.country)+'</p><small>'+escape(x.quantity)+'</small><p>'+escape(x.description)+'</p></article>');
 const requests=(r||[]).map(x=>'<article class="marketCard"><b>Buyer seeks: '+escape(x.product_name)+'</b><p>'+escape(x.country)+'</p><p>'+escape(x.description)+'</p></article>');
 $('publicListings').innerHTML=[...cards,...requests].join('')||'<p>No approved listings yet.</p>';
}
db.auth.onAuthStateChange(()=>{setTimeout(refresh,0)});
await Promise.all([refresh(),publicListings()]);
