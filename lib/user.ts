import { headers } from "next/headers";
import { auth } from "@/auth";
import { UserRole } from "@/generated/prisma/enums";

export const getCurrentUser = async () => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    return session?.user || null;
}


export const getCurrentUserBasic = async () => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const user = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role as UserRole,
        // locationId: session.user.locationId,
      }
    : null
    
    return user;
}
        
// // import { headers } from "next/headers";
// // import { auth } from "./auth";
// // import { UserRole } from "@/generated/prisma/enums";


// export const getCurrentUser = async () => {
//     // const session = await auth.api.getSession({
//     //     headers: await headers(),
//     // });
//     // return session?.user || null;
//     return {
//         id: '132',
//         name: "Test User"
//     }
// }


// export const getCurrentUserBasic = async () => {
//     // const session = await auth.api.getSession({
//     //     headers: await headers(),
//     // });

//     // const user = session?.user
//     // ? {
//     //     id: session.user.id,
//     //     name: session.user.name,
//     //     email: session.user.email,
//     //     image: session.user.image,
//     //     role: session.user.role as UserRole,
//     //     branchId: session.user.branchId,
//     //   }
//     // : null
    
//     // return user;
// }
        