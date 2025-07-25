import { getFriendsList } from "../service/friendship.service";

const friendLoader = async () => {
    try {

        const res = await getFriendsList();
        if(res.success){
            return res;
        }
        return { status: 400, message: "Something went wrong", success: false };

    } catch (error) {
        return { status: 400, message: "Something went wrong", success: false };

    }
}

export default friendLoader;