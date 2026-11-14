import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.10/+esm';
const db=createClient('https://zfjvdzjdaeymisczfznq.supabase.co','sb_publishable_3tF7Q3gB8X67iplhUO1fzw_rh8T-Enl');
const $=id=>document.getElementById(id);
const msg=(s,bad=false)=>{const el=$('marketMsg');el.textContent=s;el.style.color=bad?'#ad2929':'#075a36'};
let user=null;
let activeWorkspace='profileForm';
function setWorkspace(pane){if(pane==='adminPanel'&&$('adminTab').hidden)return;activeWorkspace=pane;for(const id of ['profileForm','productForm','requestForm','adminPanel']){const el=$(id);if(el)el.hidden=id!==pane;}for(const b of document.querySelectorAll('.workspaceTab')){const on=b.dataset.pane===pane;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));}const lists=$('workspaceLists');if(lists)lists.hidden=!['productForm','requestForm'].includes(pane);if($('productListSection'))$('productListSection').hidden=pane!=='productForm';if($('requestListSection'))$('requestListSection').hidden=pane!=='requestForm';}
$('workspaceTabs').addEventListener('click',e=>{const b=e.target.closest('button[data-pane]');if(b&&!b.hidden)setWorkspace(b.dataset.pane)});
setWorkspace('profileForm');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function refresh(){
 let u=null;try{const {data,error}=await db.auth.getUser();if(error){console.warn('Auth verification:',error.message);const {data:session}=await db.auth.getSession();u=session?.session?.user??null;if(!u&&/invalid|expired|refresh.token|not.found/i.test(error.message)){await db.auth.signOut({scope:'local'});}}else u=data?.user??null;}catch(error){console.warn('Auth unavailable:',error);try{const {data}=await db.auth.getSession();u=data?.session?.user??null;}catch{}}user=u;
 $('authPanel').hidden=!!user;$('memberPanel').hidden=!user;$('logout').hidden=!user;
 if(!user){setWorkspace('profileForm');$('adminPanel').hidden=true;$('adminTab').hidden=true;const nav=$('dashboardNav');if(nav)nav.textContent='Dashboard';return;}
 $('memberEmail').textContent=user.email||'';
 const {data:profile}=await db.from('profiles').select('display_name,country,role,company_name,business_type,website,business_description').eq('id',user.id).maybeSingle();
 if(profile){$('companyName').value=profile.company_name||'';$('businessType').value=profile.business_type||'';$('businessWebsite').value=profile.website||'';$('businessDescription').value=profile.business_description||'';$('profileName').value=profile.display_name||'';$('profileCountry').value=profile.country||'';$('profileRole').value=profile.role||'supplier'}
 const [{data:p},{data:r}]=await Promise.all([db.from('products').select('id,name,status,created_at').eq('owner_id',user.id).order('created_at',{ascending:false}).limit(30),db.from('buy_requests').select('id,product_name,status,created_at').eq('buyer_id',user.id).order('created_at',{ascending:false}).limit(30)]);
 const render=(items,type)=>items?.length?items.map(x=>'<li>'+escape(x.name||x.product_name)+' — '+escape(x.status)+' <button type="button" data-type="'+type+'" data-id="'+escape(x.id)+'">Delete pending</button></li>').join(''):'<li>No entries yet</li>';
 $('myProducts').innerHTML=render(p,'products');$('myRequests').innerHTML=render(r,'buy_requests');await loadModeration();
}
$('resendConfirmation').addEventListener('click',async()=>{const email=$('authEmail').value.trim();if(!email){msg('Enter your email first.',true);return}const {error}=await db.auth.resend({type:'signup',email,options:{emailRedirectTo:'https://salimwardak.github.io/croplink-global/#marketplace'}});msg(error?error.message:'If eligible, a new confirmation email has been sent.',!!error)});
$('resetPassword').addEventListener('click',async()=>{const email=$('authEmail').value.trim();if(!email){msg('Enter your email first.',true);return}const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:'https://salimwardak.github.io/croplink-global/#marketplace'});msg(error?error.message:'If the address is registered, a reset email will arrive.',!!error)});
$('authForm').addEventListener('submit',async e=>{
 e.preventDefault();const email=$('authEmail').value.trim(),password=$('authPassword').value;
 const signup=$('authMode').value==='signup';
 if(signup&&password.length<12){msg('New passwords must be at least 12 characters.',true);return}
 const {data,error}=signup?await db.auth.signUp({email,password,options:{emailRedirectTo:'https://salimwardak.github.io/croplink-global/#marketplace'}}):await db.auth.signInWithPassword({email,password});
 if(error){msg(error.message,true);return}
 msg(signup&&!data.session?'Account created. Check your email to confirm registration.':'Signed in successfully.');
 await refresh();
});
$('logout').addEventListener('click',async()=>{await db.auth.signOut();msg('Signed out.');await refresh()});
$('profileForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!user)return;
 const {error}=await db.from('profiles').upsert({id:user.id,display_name:$('profileName').value.trim(),company_name:$('companyName').value.trim(),business_type:$('businessType').value,business_description:$('businessDescription').value.trim(),website:$('businessWebsite').value.trim(),country:$('profileCountry').value.trim(),role:$('profileRole').value},{onConflict:'id'});
 msg(error?error.message:'Profile saved.',!!error);
});
$('productForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!user)return;
 const {error}=await db.from('products').insert({owner_id:user.id,name:$('productName').value.trim(),category:$('productCategory').value.trim(),country:$('productCountry').value.trim(),quantity:$('productQuantity').value.trim(),price:$('productPrice').value?Number($('productPrice').value):null,currency:$('productCurrency').value||null,minimum_order:$('productMOQ').value.trim(),trade_terms:$('productTerms').value||null,contact_email:$('productContact').value.trim()||null,description:$('productDescription').value.trim()});
 msg(error?error.message:'Product submitted for review.',!!error);if(!error){e.target.reset();await refresh()}
});
$('requestForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!user)return;
 const {error}=await db.from('buy_requests').insert({buyer_id:user.id,product_name:$('requestName').value.trim(),country:$('requestCountry').value.trim(),target_quantity:$('requestQuantity').value.trim(),trade_terms:$('requestTerms').value||null,contact_email:$('requestContact').value.trim()||null,description:$('requestDescription').value.trim()});
 msg(error?error.message:'Buying request submitted for review.',!!error);if(!error){e.target.reset();await refresh()}
});
$('memberPanel').addEventListener('click',async e=>{
 const b=e.target.closest('button[data-id]');if(!b||!user)return;
 const table=b.dataset.type;if(!['products','buy_requests'].includes(table))return;
 if(!confirm('Delete this pending entry?'))return;
 const {data,error}=await db.from(table).delete().eq('id',b.dataset.id).eq('status','pending').select('id');
 msg(error?error.message:data?.length?'Pending entry deleted.':'No pending entry was deleted.',!!error||!data?.length);await refresh();
});
let liveEntries=[];
function renderLiveListings(){
 const query=$('liveSearch').value.trim().toLocaleLowerCase();const type=$('liveType').value;
 const found=liveEntries.filter(x=>(type==='all'||x.type===type)&&[x.name,x.category,x.country,x.description].join(' ').toLocaleLowerCase().includes(query));
 $('publicListings').innerHTML=found.map(x=>'<article class="marketCard"><span class="tag">'+(x.type==='product'?'Supplier offer':'Buying request')+'</span><h3>'+escape(x.name)+'</h3><p>'+escape(x.country)+(x.category?' · '+escape(x.category):'')+'</p><small>'+escape(x.quantity||x.target_quantity||'')+'</small>'+(x.price!=null?'<p><strong>Indicative price: '+escape(x.currency||'')+' '+escape(x.price)+'</strong></p>':'')+(x.minimum_order?'<p>Minimum order: '+escape(x.minimum_order)+'</p>':'')+(x.trade_terms?'<p>Incoterms 2020: '+escape(x.trade_terms)+'</p>':'')+'<p>'+escape(x.description)+'</p>'+(x.contact_email?'<a href="mailto:'+encodeURIComponent(x.contact_email)+'" rel="nofollow">Contact business by email</a>':'')+'</article>').join('')||'<p>No matching approved listings yet.</p>';
}
$('liveSearch').addEventListener('input',renderLiveListings);
$('liveType').addEventListener('change',renderLiveListings);
async function publicListings(){
 const [{data:p,error:ep},{data:r,error:er}]=await Promise.all([db.from('products').select('name,category,country,description,quantity,price,currency,minimum_order,trade_terms,contact_email').eq('status','approved').order('created_at',{ascending:false}).limit(30),db.from('buy_requests').select('product_name,country,description,target_quantity,trade_terms,contact_email').eq('status','approved').order('created_at',{ascending:false}).limit(30)]);
 if(ep||er){$('publicListings').textContent='Listings temporarily unavailable.';return}
 liveEntries=[...(p||[]).map(x=>({...x,type:'product',name:x.name})),...(r||[]).map(x=>({...x,type:'request',name:x.product_name}))];
 renderLiveListings();
}

async function loadModeration(){
 const {data:membership,error:membershipError}=await db.from('admins').select('user_id').eq('user_id',user.id).maybeSingle();
 const panel=$('adminPanel');const isAdmin=!membershipError&&!!membership;const nav=$('dashboardNav');if(nav)nav.textContent=isAdmin?'Admin Dashboard':'Dashboard';$('adminTab').hidden=!isAdmin;if(!isAdmin&&activeWorkspace==='adminPanel')activeWorkspace='profileForm';setWorkspace(activeWorkspace);
 if(!isAdmin)return;
 const [{data:products,error:pe},{data:requests,error:re}]=await Promise.all([
 db.from('products').select('id,name,country,description,status').eq('status','pending').order('created_at',{ascending:true}).limit(50),
 db.from('buy_requests').select('id,product_name,country,description,status').eq('status','pending').order('created_at',{ascending:true}).limit(50)]);
 if(pe||re){$('adminQueue').textContent='Unable to load review queue.';return}
 const make=(arr,type)=>(arr||[]).map(x=>'<article class="marketCard"><strong>'+escape(x.name||x.product_name)+'</strong><p>'+escape(x.country)+'</p><p>'+escape(x.description)+'</p><button type="button" class="btn" data-review="'+type+'" data-id="'+escape(x.id)+'" data-status="approved">Approve</button> <button type="button" class="btn outline" data-review="'+type+'" data-id="'+escape(x.id)+'" data-status="rejected">Reject</button></article>').join('');
 $('adminQueue').innerHTML=make(products,'products')+make(requests,'buy_requests')||'<p>Review queue is empty.</p>';
}
$('refreshAdmin').addEventListener('click',async()=>{if(user)await loadModeration()});
$('adminPanel').addEventListener('click',async e=>{
 const b=e.target.closest('button[data-review]');if(!b||!user)return;
 const table=b.dataset.review,status=b.dataset.status;
 if(!['products','buy_requests'].includes(table)||!['approved','rejected'].includes(status))return;
 if(!confirm('Set listing to '+status+'?'))return;
 b.disabled=true;
 const {data,error}=await db.from(table).update({status}).eq('id',b.dataset.id).eq('status','pending').select('id');
 if(error||!data?.length)msg(error?.message||'No listing updated.',true);
 else {msg('Listing '+status+'.');await Promise.all([loadModeration(),publicListings()])}
 b.disabled=false;
});

db.auth.onAuthStateChange(()=>{setTimeout(refresh,0)});
const fragment=new URLSearchParams(window.location.hash.slice(1));if(fragment.get('error_description'))msg(fragment.get('error_description'),true);
db.auth.onAuthStateChange(async(event)=>{if(event==='PASSWORD_RECOVERY'){const newPassword=prompt('Enter a new password (at least 12 characters):');if(!newPassword)return;if(newPassword.length<12){msg('New password must have at least 12 characters.',true);return}const {error}=await db.auth.updateUser({password:newPassword});msg(error?error.message:'Password updated successfully.',!!error)}});
await Promise.all([refresh(),publicListings()]);
