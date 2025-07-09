using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel;

namespace TestProject.ComplexFeatures
{
    // Generic interface with constraints
    public interface IRepository<TEntity, TKey> where TEntity : class where TKey : IComparable<TKey>
    {
        Task<TEntity> GetByIdAsync(TKey id);
        Task<IEnumerable<TEntity>> GetAllAsync();
        Task<TEntity> AddAsync(TEntity entity);
        Task UpdateAsync(TEntity entity);
        Task DeleteAsync(TKey id);
    }

    // Abstract base class with generic methods
    public abstract class BaseEntity<TKey> : INotifyPropertyChanged where TKey : IComparable<TKey>
    {
        private TKey _id;
        private DateTime _createdAt;
        private DateTime? _updatedAt;

        public virtual TKey Id 
        { 
            get => _id; 
            set { _id = value; OnPropertyChanged(nameof(Id)); } 
        }

        public DateTime CreatedAt 
        { 
            get => _createdAt; 
            set { _createdAt = value; OnPropertyChanged(nameof(CreatedAt)); } 
        }

        public DateTime? UpdatedAt 
        { 
            get => _updatedAt; 
            set { _updatedAt = value; OnPropertyChanged(nameof(UpdatedAt)); } 
        }

        public event PropertyChangedEventHandler PropertyChanged;

        protected virtual void OnPropertyChanged(string propertyName)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }

    // Complex entity with inheritance and attributes
    [Serializable]
    public class Customer : BaseEntity<Guid>
    {
        private string _firstName;
        private string _lastName;
        private string _email;
        private List<Order> _orders = new List<Order>();

        [Required]
        public string FirstName 
        { 
            get => _firstName; 
            set { _firstName = value; OnPropertyChanged(nameof(FirstName)); } 
        }

        [Required]
        public string LastName 
        { 
            get => _lastName; 
            set { _lastName = value; OnPropertyChanged(nameof(LastName)); } 
        }

        [EmailAddress]
        public string Email 
        { 
            get => _email; 
            set { _email = value; OnPropertyChanged(nameof(Email)); } 
        }

        public IReadOnlyCollection<Order> Orders => _orders.AsReadOnly();

        // Complex computed property with LINQ
        public decimal TotalOrderValue => _orders?.Sum(o => o.TotalAmount) ?? 0m;

        public string FullName => $"{FirstName} {LastName}".Trim();

        // Async method with complex logic
        public async Task<Order> CreateOrderAsync(IEnumerable<OrderItem> items)
        {
            if (items == null || !items.Any())
                throw new ArgumentException("Order must contain at least one item", nameof(items));

            var order = new Order
            {
                Id = Guid.NewGuid(),
                CustomerId = this.Id,
                OrderDate = DateTime.UtcNow,
                Items = items.ToList()
            };

            // Simulate async operation
            await Task.Delay(100);
            
            _orders.Add(order);
            OnPropertyChanged(nameof(Orders));
            OnPropertyChanged(nameof(TotalOrderValue));

            return order;
        }

        // Generic method with constraints
        public TResult ProcessOrders<TResult>(Func<IEnumerable<Order>, TResult> processor) 
            where TResult : class
        {
            return processor?.Invoke(_orders) ?? default(TResult);
        }
    }

    // Complex class with events and delegates
    public class Order : BaseEntity<Guid>
    {
        private Guid _customerId;
        private DateTime _orderDate;
        private OrderStatus _status;
        private List<OrderItem> _items = new List<OrderItem>();

        public event EventHandler<OrderStatusChangedEventArgs> StatusChanged;
        public event Action<Order> OrderCompleted;

        public Guid CustomerId 
        { 
            get => _customerId; 
            set { _customerId = value; OnPropertyChanged(nameof(CustomerId)); } 
        }

        public DateTime OrderDate 
        { 
            get => _orderDate; 
            set { _orderDate = value; OnPropertyChanged(nameof(OrderDate)); } 
        }

        public OrderStatus Status 
        { 
            get => _status; 
            set 
            { 
                var oldStatus = _status;
                _status = value; 
                OnPropertyChanged(nameof(Status));
                OnStatusChanged(oldStatus, value);
            } 
        }

        public List<OrderItem> Items 
        { 
            get => _items; 
            set { _items = value ?? new List<OrderItem>(); OnPropertyChanged(nameof(Items)); } 
        }

        // Complex computed property with null-conditional operators
        public decimal TotalAmount => _items?.Sum(item => item.Quantity * item.UnitPrice) ?? 0m;

        public int ItemCount => _items?.Count ?? 0;

        // Method with complex LINQ expressions
        public IEnumerable<OrderItem> GetItemsByCategory(string category)
        {
            return _items?
                .Where(item => item.Product?.Category?.Equals(category, StringComparison.OrdinalIgnoreCase) == true)
                .OrderBy(item => item.Product.Name)
                ?? Enumerable.Empty<OrderItem>();
        }

        // Async method with exception handling
        public async Task<bool> ProcessPaymentAsync(decimal amount, string paymentMethod)
        {
            try
            {
                if (amount != TotalAmount)
                    throw new InvalidOperationException($"Payment amount {amount:C} does not match order total {TotalAmount:C}");

                // Simulate payment processing
                await Task.Delay(Random.Shared.Next(500, 2000));
                
                Status = OrderStatus.Paid;
                return true;
            }
            catch (Exception ex)
            {
                Status = OrderStatus.PaymentFailed;
                throw new PaymentProcessingException($"Payment failed: {ex.Message}", ex);
            }
        }

        private void OnStatusChanged(OrderStatus oldStatus, OrderStatus newStatus)
        {
            StatusChanged?.Invoke(this, new OrderStatusChangedEventArgs(oldStatus, newStatus));
            
            if (newStatus == OrderStatus.Completed)
                OrderCompleted?.Invoke(this);
        }
    }

    // Enum with attributes
    [Flags]
    public enum OrderStatus
    {
        [Description("Order is pending")]
        Pending = 1,
        
        [Description("Order is confirmed")]
        Confirmed = 2,
        
        [Description("Payment received")]
        Paid = 4,
        
        [Description("Order is being processed")]
        Processing = 8,
        
        [Description("Order has been shipped")]
        Shipped = 16,
        
        [Description("Order delivered")]
        Delivered = 32,
        
        [Description("Order completed")]
        Completed = 64,
        
        [Description("Order cancelled")]
        Cancelled = 128,
        
        [Description("Payment failed")]
        PaymentFailed = 256
    }

    // Record type with complex validation
    public record OrderItem(Guid Id, Product Product, int Quantity, decimal UnitPrice)
    {
        public decimal TotalPrice => Quantity * UnitPrice;
        
        public bool IsValid => Product != null && Quantity > 0 && UnitPrice >= 0;
    }

    // Another record with computed properties
    public record Product(Guid Id, string Name, string Category, decimal BasePrice)
    {
        public string DisplayName => $"{Name} ({Category})";
        
        public bool IsExpensive => BasePrice > 1000m;
    }

    // Custom exception with inheritance
    public class PaymentProcessingException : Exception
    {
        public PaymentProcessingException() { }
        public PaymentProcessingException(string message) : base(message) { }
        public PaymentProcessingException(string message, Exception innerException) : base(message, innerException) { }
    }

    // Event args class
    public class OrderStatusChangedEventArgs : EventArgs
    {
        public OrderStatus OldStatus { get; }
        public OrderStatus NewStatus { get; }
        public DateTime ChangedAt { get; }

        public OrderStatusChangedEventArgs(OrderStatus oldStatus, OrderStatus newStatus)
        {
            OldStatus = oldStatus;
            NewStatus = newStatus;
            ChangedAt = DateTime.UtcNow;
        }
    }

    // Complex service class with dependency injection pattern
    public class OrderService
    {
        private readonly IRepository<Order, Guid> _orderRepository;
        private readonly IRepository<Customer, Guid> _customerRepository;
        private readonly PaymentService _paymentService;

        public OrderService(IRepository<Order, Guid> orderRepository, 
                          IRepository<Customer, Guid> customerRepository,
                          PaymentService paymentService)
        {
            _orderRepository = orderRepository ?? throw new ArgumentNullException(nameof(orderRepository));
            _customerRepository = customerRepository ?? throw new ArgumentNullException(nameof(customerRepository));
            _paymentService = paymentService ?? throw new ArgumentNullException(nameof(paymentService));
        }

        // Complex async method with LINQ and multiple awaits
        public async Task<OrderSummary> ProcessBulkOrdersAsync(IEnumerable<CreateOrderRequest> requests)
        {
            var validRequests = requests?.Where(r => r.IsValid) ?? Enumerable.Empty<CreateOrderRequest>();
            
            var processedOrders = new List<Order>();
            var failedOrders = new List<(CreateOrderRequest Request, Exception Error)>();

            foreach (var request in validRequests)
            {
                try
                {
                    var customer = await _customerRepository.GetByIdAsync(request.CustomerId);
                    if (customer == null)
                        throw new InvalidOperationException($"Customer {request.CustomerId} not found");

                    var order = await customer.CreateOrderAsync(request.Items);
                    await _orderRepository.AddAsync(order);
                    
                    processedOrders.Add(order);
                }
                catch (Exception ex)
                {
                    failedOrders.Add((request, ex));
                }
            }

            return new OrderSummary
            {
                ProcessedCount = processedOrders.Count,
                FailedCount = failedOrders.Count,
                TotalValue = processedOrders.Sum(o => o.TotalAmount),
                ProcessedOrders = processedOrders,
                Errors = failedOrders.Select(f => f.Error.Message).ToList()
            };
        }
    }

    // DTO classes with complex validation
    public class CreateOrderRequest
    {
        public Guid CustomerId { get; set; }
        public List<OrderItem> Items { get; set; } = new();
        
        public bool IsValid => CustomerId != Guid.Empty && Items?.Any() == true && Items.All(i => i.IsValid);
    }

    public class OrderSummary
    {
        public int ProcessedCount { get; set; }
        public int FailedCount { get; set; }
        public decimal TotalValue { get; set; }
        public List<Order> ProcessedOrders { get; set; } = new();
        public List<string> Errors { get; set; } = new();
    }

    // Mock payment service
    public class PaymentService
    {
        public async Task<bool> ProcessPaymentAsync(decimal amount, string method)
        {
            await Task.Delay(100);
            return Random.Shared.NextDouble() > 0.1; // 90% success rate
        }
    }

    // Attribute classes
    public class RequiredAttribute : Attribute { }
    public class EmailAddressAttribute : Attribute { }
}