"use client";

const UnauthorizedPage = () => {
    return (
        <div className=" max-w-7xl mx-auto space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row justify-between gap-6">
                <div className={`p-4 rounded-2xl h-fit bg-rose-100 text-rose-600`}>
                    <h2 className="text-2xl font-bold">Access Denied</h2>
                    <p className="text-slate-500 mt-1">You don't have permission to view this branch's details.</p>
                </div>
            </div>
        </div>
    );
}

export default UnauthorizedPage;