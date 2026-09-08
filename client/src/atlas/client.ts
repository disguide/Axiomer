export async function api<T>(path:string,options?:RequestInit):Promise<T>{
  const response=await fetch(`/api${path}`,{...options,headers:{'Content-Type':'application/json',...options?.headers}});
  if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('The knowledge service is unavailable. Please try again.');
  const data=await response.json();if(!response.ok)throw new Error(data.error??'The request failed.');return data;
}
export const post=<T>(path:string,body:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(body)});
