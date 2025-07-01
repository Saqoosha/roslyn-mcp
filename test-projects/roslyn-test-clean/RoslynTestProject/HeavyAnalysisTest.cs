using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text;
using System.IO;
using System.Net.Http;
using System.Xml;
using System.Json;
using System.Data;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Reflection;
using System.ComponentModel;
using System.Runtime.Serialization;
using System.Security.Cryptography;

namespace RoslynTestProject.Heavy
{
    // 意図的に重い解析処理を発生させるクラス
    public class HeavyAnalysisTest
    {
        private readonly Dictionary<string, List<ComplexGenericClass<string, int, DateTime>>> heavyData;
        private readonly ConcurrentDictionary<int, Func<Task<IEnumerable<dynamic>>>> asyncOperations;
        private readonly List<IComplexInterface<T1, T2, T3>> genericInterfaces;

        public HeavyAnalysisTest()
        {
            heavyData = new Dictionary<string, List<ComplexGenericClass<string, int, DateTime>>>();
            asyncOperations = new ConcurrentDictionary<int, Func<Task<IEnumerable<dynamic>>>>();
            genericInterfaces = new List<IComplexInterface<T1, T2, T3>>();
            
            // 複雑な初期化処理
            InitializeHeavyStructures();
        }

        private void InitializeHeavyStructures()
        {
            for (int i = 0; i < 1000; i++)
            {
                var key = $"heavy_key_{i}";
                var complexList = new List<ComplexGenericClass<string, int, DateTime>>();
                
                for (int j = 0; j < 100; j++)
                {
                    var complexItem = new ComplexGenericClass<string, int, DateTime>
                    {
                        Property1 = $"complex_string_{i}_{j}",
                        Property2 = i * j,
                        Property3 = DateTime.Now.AddDays(i + j),
                        NestedComplex = new Dictionary<string, Func<Task<IEnumerable<dynamic>>>>()
                    };
                    
                    complexList.Add(complexItem);
                }
                
                heavyData[key] = complexList;
            }
        }

        // 複雑なジェネリクス制約を持つメソッド（型解析が重い）
        public async Task<TResult> ComplexGenericMethod<T1, T2, T3, TResult>(
            T1 input1, 
            T2 input2, 
            T3 input3,
            Func<T1, T2, Task<T3>> transformer,
            Func<T3, Task<TResult>> finalizer)
            where T1 : class, IComparable<T1>, IEnumerable<T2>
            where T2 : struct, IConvertible
            where T3 : new()
            where TResult : class, IDisposable
        {
            // 複雑な非同期処理チェーン
            var step1 = await ProcessStep1(input1, input2);
            var step2 = await ProcessStep2(step1, input3);
            var step3 = await transformer(input1, input2);
            var result = await finalizer(step3);
            
            return result;
        }

        private async Task<ComplexGenericClass<T1, T2, T3>> ProcessStep1<T1, T2, T3>(T1 input1, T2 input2)
            where T1 : class
            where T2 : struct
        {
            await Task.Delay(1); // 非同期処理シミュレート
            
            return new ComplexGenericClass<T1, T2, T3>
            {
                Property1 = input1,
                Property2 = input2,
                Property3 = default(T3),
                NestedComplex = CreateNestedComplexStructure<T1, T2, T3>()
            };
        }

        private async Task<IEnumerable<dynamic>> ProcessStep2<T>(T input, object context)
        {
            await Task.Delay(1);
            
            var results = new List<dynamic>();
            
            // 複雑なリフレクション処理（解析が重い）
            var type = typeof(T);
            var properties = type.GetProperties(BindingFlags.Public | BindingFlags.Instance);
            
            foreach (var prop in properties)
            {
                if (prop.CanRead)
                {
                    var value = prop.GetValue(input);
                    var dynamicResult = new
                    {
                        PropertyName = prop.Name,
                        PropertyType = prop.PropertyType.FullName,
                        Value = value,
                        Attributes = prop.GetCustomAttributes().Select(attr => attr.GetType().Name),
                        IsGeneric = prop.PropertyType.IsGenericType,
                        GenericArguments = prop.PropertyType.IsGenericType ? 
                            prop.PropertyType.GetGenericArguments().Select(t => t.FullName) : 
                            Enumerable.Empty<string>()
                    };
                    results.Add(dynamicResult);
                }
            }
            
            return results;
        }

        private Dictionary<string, Func<Task<IEnumerable<dynamic>>>> CreateNestedComplexStructure<T1, T2, T3>()
        {
            var nested = new Dictionary<string, Func<Task<IEnumerable<dynamic>>>>();
            
            // 100個の複雑なラムダ式
            for (int i = 0; i < 100; i++)
            {
                var key = $"nested_func_{i}";
                nested[key] = async () =>
                {
                    var items = new List<dynamic>();
                    await Task.Delay(1);
                    
                    for (int j = 0; j < 50; j++)
                    {
                        items.Add(new
                        {
                            Index = j,
                            TypeInfo = new
                            {
                                T1Type = typeof(T1).FullName,
                                T2Type = typeof(T2).FullName,
                                T3Type = typeof(T3).FullName,
                                IsValueType1 = typeof(T1).IsValueType,
                                IsValueType2 = typeof(T2).IsValueType,
                                IsValueType3 = typeof(T3).IsValueType,
                                AssemblyInfo = typeof(T1).Assembly.GetName().Name
                            },
                            ComplexCalculation = PerformComplexCalculation(i, j)
                        });
                    }
                    
                    return items;
                };
            }
            
            return nested;
        }

        private object PerformComplexCalculation(int i, int j)
        {
            // 複雑な計算（CPUを使用して解析を重くする）
            var fibonacci = CalculateFibonacci(i % 20 + 1);
            var factorial = CalculateFactorial(j % 10 + 1);
            var primes = GeneratePrimes((i + j) % 50 + 1);
            
            return new
            {
                Fibonacci = fibonacci,
                Factorial = factorial,
                Primes = primes,
                Timestamp = DateTime.Now,
                RandomGuid = Guid.NewGuid(),
                HashCode = (i.ToString() + j.ToString()).GetHashCode()
            };
        }

        private long CalculateFibonacci(int n)
        {
            if (n <= 1) return n;
            return CalculateFibonacci(n - 1) + CalculateFibonacci(n - 2);
        }

        private long CalculateFactorial(int n)
        {
            if (n <= 1) return 1;
            return n * CalculateFactorial(n - 1);
        }

        private List<int> GeneratePrimes(int limit)
        {
            var primes = new List<int>();
            for (int i = 2; i <= limit; i++)
            {
                bool isPrime = true;
                for (int j = 2; j * j <= i; j++)
                {
                    if (i % j == 0)
                    {
                        isPrime = false;
                        break;
                    }
                }
                if (isPrime) primes.Add(i);
            }
            return primes;
        }

        // さらに複雑なジェネリクスインターフェース
        public interface IComplexInterface<T1, T2, T3> 
            where T1 : class
            where T2 : struct
            where T3 : new()
        {
            Task<IEnumerable<TResult>> ProcessAsync<TResult>(
                Func<T1, T2, T3, Task<TResult>> processor,
                Func<TResult, bool> filter,
                IComparer<TResult> comparer)
                where TResult : IComparable<TResult>;
                
            Dictionary<string, Func<Task<IEnumerable<dynamic>>>> GetComplexMappings();
            
            void ComplexMethod(out T1 output1, ref T2 input2, in T3 input3);
        }

        // 複雑なジェネリククラス
        public class ComplexGenericClass<T1, T2, T3>
        {
            public T1 Property1 { get; set; }
            public T2 Property2 { get; set; }
            public T3 Property3 { get; set; }
            public Dictionary<string, Func<Task<IEnumerable<dynamic>>>> NestedComplex { get; set; }
            
            public async Task<TResult> TransformAsync<TResult>(
                Func<T1, T2, T3, Task<TResult>> transformer)
            {
                return await transformer(Property1, Property2, Property3);
            }
        }

        // 非常に複雑な式木を含むメソッド（型推論が重い）
        public IQueryable<TResult> CreateComplexQuery<TSource, TResult>(
            IQueryable<TSource> source,
            Func<TSource, bool> predicate,
            Func<TSource, TResult> selector)
            where TSource : class
            where TResult : class
        {
            return source
                .Where(x => predicate(x))
                .Select(x => selector(x))
                .Where(x => x != null)
                .OrderBy(x => x.GetHashCode())
                .ThenBy(x => x.ToString())
                .GroupBy(x => x.GetType().Name)
                .SelectMany(g => g.Take(10))
                .Distinct()
                .AsQueryable();
        }

        // タイムアウトを誘発しやすいメソッド（大量のメタデータ解析）
        public void AnalyzeAllTypesInAssembly()
        {
            var assemblies = AppDomain.CurrentDomain.GetAssemblies();
            var typeAnalysis = new Dictionary<string, object>();
            
            foreach (var assembly in assemblies)
            {
                try
                {
                    var types = assembly.GetTypes();
                    foreach (var type in types.Take(100)) // 制限を設けて無限ループを防ぐ
                    {
                        var analysis = new
                        {
                            FullName = type.FullName,
                            IsGeneric = type.IsGenericType,
                            GenericArguments = type.IsGenericType ? 
                                type.GetGenericArguments().Select(t => t.Name).ToArray() : 
                                new string[0],
                            Methods = type.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                                .Take(20)
                                .Select(m => new
                                {
                                    Name = m.Name,
                                    ReturnType = m.ReturnType.Name,
                                    Parameters = m.GetParameters().Select(p => new
                                    {
                                        Name = p.Name,
                                        Type = p.ParameterType.Name,
                                        IsOptional = p.IsOptional,
                                        DefaultValue = p.HasDefaultValue ? p.DefaultValue : null
                                    }).ToArray(),
                                    IsGeneric = m.IsGenericMethod,
                                    GenericParameters = m.IsGenericMethod ?
                                        m.GetGenericArguments().Select(t => t.Name).ToArray() :
                                        new string[0]
                                }).ToArray(),
                            Properties = type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                                .Take(20)
                                .Select(p => new
                                {
                                    Name = p.Name,
                                    Type = p.PropertyType.Name,
                                    CanRead = p.CanRead,
                                    CanWrite = p.CanWrite,
                                    Attributes = p.GetCustomAttributes().Select(a => a.GetType().Name).ToArray()
                                }).ToArray()
                        };
                        
                        typeAnalysis[type.FullName ?? type.Name] = analysis;
                    }
                }
                catch (ReflectionTypeLoadException)
                {
                    // スキップ - 一部のアセンブリは読み込めない場合がある
                }
            }
        }
    }
    
    // 追加の複雑なクラス構造
    public abstract class AbstractComplexBase<T> where T : class, new()
    {
        protected abstract Task<IEnumerable<TResult>> ProcessInternal<TResult>(T input)
            where TResult : class;
            
        public virtual async Task<List<TOutput>> ProcessWithConversion<TOutput>(
            T input,
            Func<object, Task<TOutput>> converter)
            where TOutput : class
        {
            var intermediate = await ProcessInternal<object>(input);
            var results = new List<TOutput>();
            
            foreach (var item in intermediate)
            {
                try
                {
                    var converted = await converter(item);
                    if (converted != null)
                    {
                        results.Add(converted);
                    }
                }
                catch (Exception)
                {
                    // エラーハンドリング
                }
            }
            
            return results;
        }
    }
}