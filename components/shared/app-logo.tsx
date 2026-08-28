import Image from "next/image";

const AppLogo = () => {
  return ( 
    <div className="relative flex size-8 items-center justify-center rounded-md overflow-hidden shadow-md border-border ">
      <Image
        src="/assets/jg-logo.png" 
        fill
        sizes="50px"
        priority
        alt="JG Logo" 
        className="object-contain"
      />
    </div>
  );
}
 
export default AppLogo;