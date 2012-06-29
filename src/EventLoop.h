#ifndef EVENTLOOP_H
#define EVENTLOOP_H

#include "Mutex.h"
#include "WaitCondition.h"
#include "Thread.h"
#include <vector>

class Event;
class EventReceiver;
struct timeval;

class EventLoop
{
public:
    EventLoop();
    ~EventLoop();

    static EventLoop* instance();

    enum { Read = 1, Write = 2 };
    typedef void(*FdFunc)(int, unsigned int, void*);
    typedef void(*TimerFunc)(int, void*);

    // The following three functions are thread safe
    int addTimer(int timeout, TimerFunc callback, void* userData);
    void removeTimer(int handle);
    void addFileDescriptor(int fd, unsigned int flags, FdFunc callback, void* userData);
    void removeFileDescriptor(int fd);
    void postEvent(EventReceiver* object, Event* event);

    void run();
    void exit();

    pthread_t thread() const { return mThread; }
private:
    void handlePipe();
    void sendPostedEvents();

private:
    int mEventPipe[2];
    bool mQuit;

    Mutex mMutex;
    WaitCondition mCond;

    struct FdData {
        int fd;
        unsigned int flags;
        FdFunc callback;
        void* userData;
    };
    std::vector<FdData> mFdData;

    int mNextTimerHandle;
    struct TimerData {
        int handle;
        int timeout;
        TimerFunc callback;
        void* userData;
    };
    std::vector<TimerData*> mTimerData;
    std::map<int, TimerData*> mTimerByHandle;

    static bool timerLessThan(TimerData* a, TimerData* b);

    struct EventData {
        EventReceiver* receiver;
        Event* event;
    };
    std::vector<EventData> mEvents;

    static EventLoop* sInstance;

    pthread_t mThread;
};

#endif
