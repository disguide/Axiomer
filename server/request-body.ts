import { ApiError } from './repository';
export async function boundedBody(request:Request,maxBytes:number):Promise<Uint8Array>{
  if(Number(request.headers.get('content-length')??0)>maxBytes)throw new ApiError(413,'Request too large.');
  if(!request.body)return new Uint8Array();const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw new ApiError(413,'Request too large.');}chunks.push(value);}}finally{reader.releaseLock();}
  const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
