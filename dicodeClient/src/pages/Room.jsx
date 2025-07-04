import React, { useEffect, useState } from 'react';
import { useLoaderData, useNavigate, useParams } from 'react-router-dom';
import useUser from '../provider/UserProvider';
import Editor from '../component/Editor';
import Canvas from '../component/Canvas';
import WaitingScreen from '../component/WaitingScreen';
import useSocket from '../provider/SocketProvider';

function Room() {
  const [incommingCalls, setIncomingCalls] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');

  const { roomId } = useParams();
  const { userData } = useUser();
  const data = useLoaderData();

  console.log(" data ", data);


  const [roomDetails, setRoomDetails] = useState(data.data || {});
  const { socket } = useSocket();
  const navigate = useNavigate();

  const isCreator = roomDetails?.creator?._id === userData._id;

  useEffect(() => {
    if (!socket) return;

    socket.emit("register", { roomId });
    socket.emit("join-req", { roomId });
    socket.emit("need-latest-code",{});

    socket.on("give-req", ({ userData }) => {
      setIncomingCalls((prev) => {
        const alreadyExists = prev.some((u) => u._id === userData._id);
        if (alreadyExists) return prev;
        return [...prev, userData];
      });
    });

    socket.on("room-updated", ({ userId }) => {
      setRoomDetails((prev) => ({
        ...prev,
        members: prev.members.filter((member) => member.user._id !== userId),
      }));
    });

    socket.on("navigate-room", () => {
      navigate("/space")
    })


    socket.on("joined-room", ({ user }) => {

  

      setRoomDetails((prev) => {
        const alreadyExists = prev.members.some(m => m?.user?._id === user?._id);
        if (alreadyExists) return prev;

        return {
          ...prev,
          members: [...prev.members, { user, role: "viewer" }],
        };
      });

      setIncomingCalls((prev) => prev.filter(u => u._id !== user._id));
    });

    socket.on("joine-room", ({ user }) => {

      setRoomDetails((prev) => {
        const alreadyExists = prev.members.some(m => m?.user?._id === user?._id);
        if (alreadyExists) return prev;

        return {
          ...prev,
          members: [...prev.members, { user, role: "viewer" }],
        };
      });

      socket.emit("join-req")

    });

    socket.on("no-host", () => {
      navigate("/space");
    });

    return () => {
      socket.off("give-req");
      socket.off("joined-room");
      socket.off("no-host");
    };
  }, [socket]);

  const isMember = roomDetails.members?.some(
    m => m.user._id === userData._id
  );

  const userRole = roomDetails.members?.find(
    m => m.user._id === userData._id
  )?.role;

  const handleJoinRoom = (user) => {
    socket.emit("join-room", { roomId, user });
  };

  const handleKickUser = (userId) => {
    socket.emit("kick-room", { userId })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-cyan-400">
          Room: {roomDetails.name}
        </h1>

        {isMember && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-1 rounded-full border transition-all duration-200 ${activeTab === 'editor'
                ? 'border-cyan-400 text-cyan-300 bg-[#1e293b]'
                : 'border-gray-600 text-gray-400 hover:text-cyan-200 hover:border-cyan-400'
                }`}
            >
              Editor
            </button>
            <button
              onClick={() => setActiveTab('canvas')}
              className={`px-4 py-1 rounded-full border transition-all duration-200 ${activeTab === 'canvas'
                ? 'border-indigo-400 text-indigo-300 bg-[#1e293b]'
                : 'border-gray-600 text-gray-400 hover:text-indigo-200 hover:border-indigo-400'
                }`}
            >
              Canvas
            </button>
          </div>
        )}
      </div>

      {/* Main Area */}
      {isMember ? (
        <div className="rounded-lg border border-white/10 overflow-hidden bg-[#111]">
          <div className={activeTab === 'editor' ? 'block' : 'hidden'}>
            <Editor role={userRole} roomId={roomId} />
          </div>
          <div className={activeTab === 'canvas' ? 'block' : 'hidden'}>
            <Canvas role={userRole} roomId={roomId} />
          </div>
        </div>
      ) : (
        <WaitingScreen roomId={roomId} />
      )}

      {/* Action Buttons */}
      {isMember && (
        <div className="mt-8 flex justify-center gap-4">
          {isCreator && (
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-6 py-2 bg-yellow-500 text-black font-medium rounded-md hover:bg-yellow-400"
            >
              Show Join Requests
            </button>
          )}
          <button
            onClick={() => setShowMembersModal(true)}
            className="px-6 py-2 bg-cyan-500 text-black font-medium rounded-md hover:bg-cyan-400"
          >
            View All Members
          </button>
        </div>
      )}

      {/* Join Requests Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#121212] p-6 rounded-2xl max-w-md w-full border border-yellow-400/30">
            <button
              onClick={() => setShowJoinModal(false)}
              className="absolute top-3 right-4 text-gray-300 hover:text-red-400 text-2xl font-bold"
            >
              &times;
            </button>
            <h2 className="text-xl font-semibold text-yellow-300 mb-5">
              Incoming Join Requests
            </h2>

            {incommingCalls.length === 0 ? (
              <p className="text-sm text-gray-400 text-center italic">No incoming requests.</p>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                {incommingCalls.map((user, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-[#1a1a1a] border border-yellow-500/10 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="font-medium text-yellow-200 text-sm">{user.name}</p>
                        <p className="text-xs text-gray-400">@{user.username}</p>
                      </div>
                    </div>
                    <button
                      className="px-3 py-1 text-sm bg-green-500 hover:bg-green-400 text-black font-semibold rounded-md"
                      onClick={() => handleJoinRoom(user)}
                    >
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* View Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#121212] p-6 rounded-2xl max-w-md w-full border border-cyan-500/30 relative">
            <button
              onClick={() => setShowMembersModal(false)}
              className="absolute top-3 right-4 text-gray-300 hover:text-red-400 text-2xl font-bold"
            >
              &times;
            </button>
            <h2 className="text-xl font-semibold text-cyan-300 mb-5">All Members</h2>

            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
              {roomDetails.members?.map(({ user }, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-[#1a1a1a] border border-cyan-500/10 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <img src={user?.avatar} alt={user?.name} className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="font-medium text-cyan-200 text-sm">{user?.name}</p>
                      <p className="text-xs text-gray-400">@{user?.username}</p>
                    </div>
                  </div>

                  {isCreator && user?._id !== userData._id && (
                    <button
                      className="px-3 py-1 text-sm bg-red-500 hover:bg-red-400 text-white font-medium rounded-md"
                      onClick={() => handleKickUser(user?._id)}
                    >
                      Kick
                    </button>
                  )}

                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );

}

export default Room;
