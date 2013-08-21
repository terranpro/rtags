#include "TranslationUnitCache.h"
#include "Server.h"

TranslationUnit::TranslationUnit(const SourceInformation &sourceInfo, TranslationUnitCache *cache, CXTranslationUnit unit)
    : mState(Invalid), mCache(cache), mTranslationUnit(unit), mSourceInformation(sourceInfo)
{
}

TranslationUnit::~TranslationUnit()
{
    if (mTranslationUnit)
        clang_disposeTranslationUnit(mTranslationUnit);
}

TranslationUnit::State TranslationUnit::state() const
{
    std::lock_guard<std::mutex> lock(mMutex);
    return mState;
}

void TranslationUnit::transition(State state, CXTranslationUnit *unit)
{
    std::lock_guard<std::mutex> lock(mMutex);
    mState = state;
    if (unit)
        mTranslationUnit = *unit;
    mCondition.notify_all();
}

TranslationUnitCache * TranslationUnit::cache() const
{
    return mCache;
}

CXIndex TranslationUnit::index() const
{
    return Server::instance()->clangIndex();
}

CXTranslationUnit TranslationUnit::translationUnit() const
{
    std::lock_guard<std::mutex> lock(mMutex);
    return mTranslationUnit;
}

TranslationUnitCache::TranslationUnitCache(int size)
    : mFirst(0), mLast(0), mMaxSize(size)
{

}

TranslationUnitCache::~TranslationUnitCache()
{
    clear();
}

void TranslationUnitCache::clear()
{
    std::lock_guard<std::mutex> lock(mMutex);
    CachedUnit *unit = mFirst;
    while (unit) {
        CachedUnit *tmp = unit;
        unit = unit->next;
        delete tmp;
    }
    mFirst = mLast = 0;
    mUnits.clear();
}

std::shared_ptr<TranslationUnit> TranslationUnitCache::find(uint32_t fileId)
{
    std::lock_guard<std::mutex> lock(mMutex);
    if (CachedUnit *unit = mUnits.value(fileId)) {
        moveToEnd(unit);
        return unit->translationUnit;
    }
    return std::shared_ptr<TranslationUnit>();
}

std::shared_ptr<TranslationUnit> TranslationUnitCache::get(const SourceInformation &info)
{
    std::lock_guard<std::mutex> lock(mMutex);
    CachedUnit *unit = mUnits.value(info.fileId);
    if (unit) {
        const SourceInformation s = unit->translationUnit->sourceInformation();
        if (s.compiler == info.compiler && s.args == info.args) {
            moveToEnd(unit);
            return unit->translationUnit;
        }
    }
    return std::shared_ptr<TranslationUnit>();
}

void TranslationUnitCache::insert(const std::shared_ptr<TranslationUnit> &translationUnit)
{
    std::lock_guard<std::mutex> lock(mMutex);
    CachedUnit *&unit = mUnits[translationUnit->sourceInformation().fileId];
    if (unit) {
        unit->translationUnit = translationUnit;
        moveToEnd(unit);
        return;
    }
    unit = new CachedUnit;
    unit->translationUnit = translationUnit;
    unit->next = 0;
    unit->prev = mLast;
    if (mLast) {
        mLast->next = unit;
        mLast = unit;
    } else {
        assert(!mFirst);
        mFirst = mLast = unit;
    }
    purge();
}

void TranslationUnitCache::purge() // lock always held
{
    while (mUnits.size() > mMaxSize) {
        CachedUnit *tmp = mFirst;
        mFirst = tmp->next;
        delete tmp;
        if (mFirst) {
            mFirst->prev = 0;
        } else {
            mLast = 0;
            assert(mUnits.isEmpty());
        }
    }
}

int TranslationUnitCache::size() const
{
    std::lock_guard<std::mutex> lock(mMutex);
    return mUnits.size();
}

void TranslationUnitCache::moveToEnd(CachedUnit *unit) // lock always held
{
    assert(unit);
    assert(mLast);
    if (unit != mLast) {
        if (unit->prev) {
            unit->prev->next = unit->next;
        } else {
            mFirst = unit->next;
        }
        unit->next->prev = unit->prev;
        unit->next = 0;
        unit->prev = mLast;
        mLast->next = unit->prev;
        mLast = unit;
    }
}
List<SourceInformation> TranslationUnitCache::sourceInformations() const
{
    std::lock_guard<std::mutex> lock(mMutex);
    List<SourceInformation> ret;
    ret.reserve(mUnits.size());
    for (CachedUnit *unit = mFirst; unit; unit = unit->next) {
        ret.append(unit->translationUnit->sourceInformation());
    }
    return ret;
}
